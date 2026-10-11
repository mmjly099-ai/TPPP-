import React, { useState } from 'react';
import {
  Bike,
  Plus,
  Search,
  Phone,
  MapPin,
  Calendar,
  CheckCircle2,
  XCircle,
  Edit,
  Trash2,
  ExternalLink,
  DollarSign,
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  UserCheck,
  UserX,
  MessageCircle,
  FileText
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { Courier } from '../../types';
import { CourierProfileModal } from './CourierProfileModal';

interface CouriersListTabProps {
  onOpenSettlementForCourier: (c: Courier) => void;
  onOpenReceiveCashFromCourier: (c: Courier) => void;
  userRole?: 'admin' | 'accountant' | 'courier';
}

export const CouriersListTab: React.FC<CouriersListTabProps> = ({
  onOpenSettlementForCourier,
  onOpenReceiveCashFromCourier,
  userRole = 'admin'
}) => {
  const { couriers = [], deliveryOrders = [], addCourier, updateCourier, deleteCourier, showNotification } = useStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCourier, setEditingCourier] = useState<Courier | null>(null);
  const [viewingProfileCourier, setViewingProfileCourier] = useState<Courier | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    zone: '',
    coverageZones: '',
    startDate: new Date().toISOString().split('T')[0],
    defaultDeliveryFee: 1500,
    vehicleType: 'دراجة نارية' as const,
    status: 'active' as const,
    notes: ''
  });

  // Filtered Couriers
  const filteredCouriers = couriers.filter(c => {
    const term = searchTerm.trim().toLowerCase();
    const matchSearch =
      !term ||
      c.name.toLowerCase().includes(term) ||
      c.phone.includes(term) ||
      c.code.toLowerCase().includes(term) ||
      (c.zone && c.zone.toLowerCase().includes(term)) ||
      (c.coverageZones && c.coverageZones.toLowerCase().includes(term));

    const isActive = c.status === 'active' || c.status === 'available';
    const matchStatus =
      statusFilter === 'all' ? true : statusFilter === 'active' ? isActive : !isActive;

    return matchSearch && matchStatus;
  });

  const handleOpenAddModal = () => {
    setEditingCourier(null);
    setFormData({
      name: '',
      phone: '',
      zone: 'صنعاء',
      coverageZones: '',
      startDate: new Date().toISOString().split('T')[0],
      defaultDeliveryFee: 1500,
      vehicleType: 'دراجة نارية',
      status: 'active',
      notes: ''
    });
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (c: Courier) => {
    setEditingCourier(c);
    setFormData({
      name: c.name,
      phone: c.phone,
      zone: c.zone || 'صنعاء',
      coverageZones: c.coverageZones || '',
      startDate: c.startDate || c.createdAt?.split('T')[0] || new Date().toISOString().split('T')[0],
      defaultDeliveryFee: c.defaultDeliveryFee || 1500,
      vehicleType: (c.vehicleType as any) || 'دراجة نارية',
      status: (c.status === 'inactive' ? 'inactive' : 'active') as any,
      notes: c.notes || ''
    });
    setIsAddModalOpen(true);
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim()) {
      showNotification('يرجى ملء اسم الموصل ورقم الهاتف', 'warning');
      return;
    }

    if (editingCourier) {
      updateCourier({
        ...editingCourier,
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        zone: formData.zone.trim(),
        coverageZones: formData.coverageZones.trim() || formData.zone.trim(),
        startDate: formData.startDate,
        defaultDeliveryFee: Number(formData.defaultDeliveryFee) || 1500,
        vehicleType: formData.vehicleType,
        status: formData.status,
        notes: formData.notes.trim()
      });
      showNotification(`تم تحديث بيانات الموصل ${formData.name}`, 'success');
    } else {
      addCourier({
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        coverageZones: formData.coverageZones.trim() || formData.zone.trim() || 'صنعاء',
        defaultDeliveryFee: Number(formData.defaultDeliveryFee) || 1500,
        vehicleType: formData.vehicleType,
        status: formData.status,
        notes: formData.notes.trim(),
        currentCustodyBalance: 0
      });
      showNotification(`تمت إضافة الموصل الجديد ${formData.name} بنجاح`, 'success');
    }

    setIsAddModalOpen(false);
  };

  const handleToggleStatus = (courier: Courier) => {
    const nextStatus = courier.status === 'active' || courier.status === 'available' ? 'inactive' : 'active';
    updateCourier({
      ...courier,
      status: nextStatus
    });
    showNotification(
      nextStatus === 'active' ? `تم تفعيل الموصل ${courier.name}` : `تم إيقاف الموصل ${courier.name}`,
      'success'
    );
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      
      {/* Top Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
            <Bike className="w-5 h-5 text-[#1A3668]" />
            فريق الموصّلين ومندوبي التوصيل ({couriers.length})
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            إدارة بيانات الموصلين، مناطق العمل، متابعة العهد النقدية، وتحديث الحالات
          </p>
        </div>

        <div className="flex items-center gap-2">
          {userRole === 'admin' && (
            <button
              onClick={handleOpenAddModal}
              className="px-4 py-2 bg-[#1A3668] hover:bg-[#234885] text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition-all"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>إضافة موصل جديد</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="w-full sm:w-80 relative">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="بحث بالاسم، رقم الهاتف، الكود، المنطقة..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-3 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#1A3668]"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl self-stretch sm:self-auto">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              statusFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            الكل ({couriers.length})
          </button>
          <button
            onClick={() => setStatusFilter('active')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              statusFilter === 'active' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            النشطون ({couriers.filter(c => c.status === 'active' || c.status === 'available').length})
          </button>
          <button
            onClick={() => setStatusFilter('inactive')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              statusFilter === 'inactive' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            المتوقفون ({couriers.filter(c => c.status === 'inactive').length})
          </button>
        </div>
      </div>

      {/* Couriers Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCouriers.map(courier => {
          const isActive = courier.status === 'active' || courier.status === 'available';
          const courierAssigned = deliveryOrders.filter(o => o.courierId === courier.id);
          const deliveredCount = courierAssigned.filter(o => o.status === 'delivered').length;
          const pendingCount = courierAssigned.filter(
            o => o.status === 'out_for_delivery' || o.status === 'received_by_courier' || o.status === 'pending_dispatch'
          ).length;
          const cashCustodyOrders = courierAssigned.filter(
            o => o.collectionMethod === 'cash_to_courier' && (o.collectionStatus === 'collected_cash' || o.status === 'delivered')
          );
          const payableOrders = courierAssigned.filter(
            o => o.collectionMethod === 'transfer_to_wallet' && (o.collectionStatus === 'transferred_to_wallet' || o.status === 'delivered')
          );
          const custodyBal = Number(courier.currentCustodyBalance) || 0;
          const payableBal = Number(courier.currentPayableBalance) || 0;

          return (
            <div
              key={courier.id}
              className={`bg-white rounded-3xl border transition-all p-5 shadow-xs hover:shadow-md space-y-4 ${
                isActive ? 'border-slate-200 hover:border-[#1A3668]/40' : 'border-slate-200 bg-slate-50/60 opacity-80'
              }`}
            >
              
              {/* Card Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-blue-50 text-[#1A3668] flex items-center justify-center font-bold shrink-0">
                    <Bike className="w-5 h-5 text-[#1A3668]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-black text-sm text-slate-900">{courier.name}</h3>
                      <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                        {courier.code}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 font-mono flex items-center gap-1.5 mt-0.5" dir="ltr">
                      <Phone className="w-3 h-3 text-slate-400" />
                      {courier.phone}
                    </div>
                  </div>
                </div>

                {/* Status Toggle Switch */}
                <button
                  onClick={() => handleToggleStatus(courier)}
                  title={isActive ? 'انقر لإيقاف الموصل' : 'انقر لتنشيط الموصل'}
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-full border transition cursor-pointer flex items-center gap-1 ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                      : 'bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                  {isActive ? 'نشط' : 'متوقف'}
                </button>
              </div>

              {/* Zone and Details */}
              <div className="p-3 bg-slate-50 rounded-2xl space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-slate-600">
                  <span className="flex items-center gap-1 text-slate-500">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    منطقة التغطية:
                  </span>
                  <span className="font-bold text-slate-900">{courier.zone || courier.coverageZones || 'صنعاء'}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span className="text-slate-500">أجرة التوصيل الافتراضية:</span>
                  <span className="font-bold text-[#1A3668]">{(courier.defaultDeliveryFee || 1500).toLocaleString()} ريال</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span className="text-slate-500">الطلبات المسلمة بنجاح:</span>
                  <span className="font-black text-emerald-700">{deliveredCount} طلب ({pendingCount} قيد التسليم)</span>
                </div>
              </div>

              {/* Operational & Financial Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                
                {/* Cash Custody (رصيد المندوب - نقدي للمندوب نفسه) */}
                <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-2xl flex flex-col justify-between space-y-2">
                  <div>
                    <span className="text-[11px] text-amber-950 font-black block">رصيد المندوب (نقدي عنده)</span>
                    <span className="text-base font-black text-amber-800 mt-0.5 block">
                      {custodyBal.toLocaleString()} <span className="text-[10px] font-normal">ريال</span>
                    </span>
                    {cashCustodyOrders.length > 0 ? (
                      <div className="mt-1.5 space-y-1 max-h-20 overflow-y-auto">
                        {cashCustodyOrders.slice(0, 3).map(o => (
                          <div key={o.id} className="text-[10px] bg-white/90 border border-amber-200 rounded-md px-1.5 py-0.5 font-bold text-amber-900 flex items-center justify-between">
                            <span>طلب رقم #{o.orderNumber}</span>
                            <span className="font-mono">{(Number(o.custodyRecordedAmount) || Number(o.finalPaymentAmount) || Number(o.deliveryFee)).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-500 block mt-1">لا توجد مبالغ نقدية بعهدته</span>
                    )}
                  </div>
                  {custodyBal > 0 && (
                    <button
                      onClick={() => onOpenReceiveCashFromCourier(courier)}
                      className="w-full py-1 px-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[10px] font-bold transition cursor-pointer"
                    >
                      استلام النقدية منه ←
                    </button>
                  )}
                </div>

                {/* Courier Payable Entitlement (استحقاق المندوب عندنا - محفظة) */}
                <div className="p-3 bg-purple-50/80 border border-purple-200 rounded-2xl flex flex-col justify-between space-y-2">
                  <div>
                    <span className="text-[11px] text-purple-950 font-black block">استحقاق المندوب عندنا</span>
                    <span className="text-base font-black text-purple-800 mt-0.5 block">
                      {payableBal.toLocaleString()} <span className="text-[10px] font-normal">ريال</span>
                    </span>
                    {payableOrders.length > 0 ? (
                      <div className="mt-1.5 space-y-1 max-h-20 overflow-y-auto">
                        {payableOrders.slice(0, 3).map(o => (
                          <div key={o.id} className="text-[10px] bg-white/90 border border-purple-200 rounded-md px-1.5 py-0.5 font-bold text-purple-900 flex items-center justify-between">
                            <span>طلب رقم #{o.orderNumber}</span>
                            <span className="font-mono">{(Number(o.payableRecordedAmount) || Number(o.deliveryFee)).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-500 block mt-1">مستحقاته مسواة بالكامل</span>
                    )}
                  </div>
                  {payableBal > 0 && (
                    <button
                      onClick={() => onOpenSettlementForCourier(courier)}
                      className="w-full py-1 px-2 bg-[#1A3668] hover:bg-[#234885] text-white rounded-lg text-[10px] font-bold transition cursor-pointer"
                    >
                      دفع استحقاق المندوب ←
                    </button>
                  )}
                </div>

              </div>

              {/* Quick Actions Footer */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  onClick={() => setViewingProfileCourier(courier)}
                  className="flex-1 py-2 px-3 bg-[#1A3668] hover:bg-[#234885] text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>فتح كشف حساب المندوب</span>
                </button>

                <div className="flex items-center gap-1.5">
                  <a
                    href={`https://wa.me/${courier.phone.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    title="محادثة واتساب"
                    className="w-8 h-8 rounded-xl bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-700 flex items-center justify-center transition cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4" />
                  </a>

                  {userRole === 'admin' && (
                    <button
                      onClick={() => handleOpenEditModal(courier)}
                      title="تعديل بيانات الموصل"
                      className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition cursor-pointer"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

            </div>
          );
        })}

        {filteredCouriers.length === 0 && (
          <div className="col-span-full py-16 text-center text-slate-400 text-xs bg-white rounded-3xl border border-slate-200">
            <Bike className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            لا يوجد موصلون مطابقون لمعايير البحث
          </div>
        )}
      </div>

      {/* Courier Profile Modal */}
      {viewingProfileCourier && (
        <CourierProfileModal
          courier={viewingProfileCourier}
          onClose={() => setViewingProfileCourier(null)}
          onOpenSettlementForCourier={c => {
            setViewingProfileCourier(null);
            onOpenSettlementForCourier(c);
          }}
          onOpenReceiveCashFromCourier={c => {
            setViewingProfileCourier(null);
            onOpenReceiveCashFromCourier(c);
          }}
        />
      )}

      {/* Add / Edit Courier Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs" dir="rtl">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-[#1A3668] text-white p-5 flex items-center justify-between">
              <div>
                <h3 className="font-black text-base">
                  {editingCourier ? `تعديل بيانات الموصل: ${editingCourier.name}` : 'إضافة موصل جديد للنظام'}
                </h3>
                <p className="text-xs text-blue-200">TOP STORE • إدارة فريق التسليم والتوزيع</p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="p-5 sm:p-6 space-y-4 text-xs">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Name */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    اسم الموصل <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="الاسم الكامل"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-[#1A3668]"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    رقم الهاتف <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    dir="ltr"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="77XXXXXXX"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-right focus:outline-none focus:ring-2 focus:ring-[#1A3668]"
                  />
                </div>

                {/* Zone */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    المنطقة الرئيسية <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.zone}
                    onChange={e => setFormData({ ...formData, zone: e.target.value })}
                    placeholder="صنعاء - الستين، حدة، السبعين..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1A3668]"
                  />
                </div>

                {/* Start Date */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    تاريخ بدء العمل
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-[#1A3668]"
                  />
                </div>

                {/* Default Delivery Fee */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    أجرة التوصيل الافتراضية
                  </label>
                  <input
                    type="number"
                    value={formData.defaultDeliveryFee}
                    onChange={e => setFormData({ ...formData, defaultDeliveryFee: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-[#1A3668]"
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    حالة الموصل
                  </label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-[#1A3668]"
                  >
                    <option value="active">نشط (جاهز لاستلام الطلبات)</option>
                    <option value="inactive">غير نشط (متوقف)</option>
                  </select>
                </div>
              </div>

              {/* Coverage Zones */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  ملاحظات مناطق التغطية التفصيلية:
                </label>
                <input
                  type="text"
                  value={formData.coverageZones}
                  onChange={e => setFormData({ ...formData, coverageZones: e.target.value })}
                  placeholder="مثال: يغطي صنعاء، ومحافظات ذمار وعمران يومي الاثنين والخميس"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1A3668]"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  ملاحظات إضافية:
                </label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="أي تفاصيل خاصة بنوع المركبة، الضمانة، أوقات العمل..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1A3668]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#1A3668] hover:bg-[#234885] text-white font-bold rounded-xl cursor-pointer shadow-md"
                >
                  {editingCourier ? 'حفظ التعديلات' : 'إضافة الموصل الآن'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
