import React, { useState, useMemo } from 'react';
import {
  Bike,
  Plus,
  Search,
  Phone,
  MapPin,
  Trash2,
  Edit2,
  DollarSign,
  Wallet,
  CheckCircle2,
  Clock,
  UserCheck,
  UserX,
  AlertCircle,
  Eye,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { Courier } from '../../types';
import { CourierProfileModal } from './CourierProfileModal';

interface CouriersListTabProps {
  onOpenSettlementForCourier: (courier: Courier) => void;
  onOpenReceiveCashFromCourier: (courier: Courier) => void;
  userRole?: 'admin' | 'accountant' | 'courier';
}

export const CouriersListTab: React.FC<CouriersListTabProps> = ({
  onOpenSettlementForCourier,
  onOpenReceiveCashFromCourier,
  userRole = 'admin'
}) => {
  const {
    couriers = [],
    deliveryOrders = [],
    addCourier,
    updateCourier,
    deleteCourier,
    clearCourierCustody,
    clearAllCourierCustodies
  } = useStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'on_delivery' | 'active' | 'inactive'>('all');

  // Modals state
  const [selectedProfileCourier, setSelectedProfileCourier] = useState<Courier | null>(null);
  const [courierToEdit, setCourierToEdit] = useState<Courier | null>(null);
  const [courierToDelete, setCourierToDelete] = useState<Courier | null>(null);
  const [courierToClearCustody, setCourierToClearCustody] = useState<Courier | null>(null);
  const [isClearAllCustodiesModalOpen, setIsClearAllCustodiesModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form states
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formZone, setFormZone] = useState('');
  const [formCoverage, setFormCoverage] = useState('');
  const [formVehicle, setFormVehicle] = useState<'دراجة نارية' | 'سيارة' | 'دباب' | 'مكتب نقل' | 'أخرى'>('دراجة نارية');
  const [formFee, setFormFee] = useState<number>(1000);
  const [formStatus, setFormStatus] = useState<'available' | 'on_delivery' | 'active' | 'inactive'>('available');

  const openAddModal = () => {
    setFormName('');
    setFormPhone('');
    setFormZone('');
    setFormCoverage('');
    setFormVehicle('دراجة نارية');
    setFormFee(1000);
    setFormStatus('available');
    setIsAddModalOpen(true);
  };

  const openEditModal = (c: Courier) => {
    setCourierToEdit(c);
    setFormName(c.name);
    setFormPhone(c.phone);
    setFormZone(c.zone || '');
    setFormCoverage(c.coverageZones || '');
    setFormVehicle(c.vehicleType || 'دراجة نارية');
    setFormFee(c.defaultDeliveryFee || 1000);
    setFormStatus(c.status);
  };

  const handleSaveAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    addCourier({
      name: formName.trim(),
      phone: formPhone.trim(),
      zone: formZone.trim() || undefined,
      coverageZones: formCoverage.trim() || formZone.trim() || 'صنعاء',
      vehicleType: formVehicle,
      defaultDeliveryFee: formFee,
      status: formStatus
    });

    setIsAddModalOpen(false);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!courierToEdit || !formName.trim()) return;

    updateCourier({
      ...courierToEdit,
      name: formName.trim(),
      phone: formPhone.trim(),
      zone: formZone.trim() || undefined,
      coverageZones: formCoverage.trim() || formZone.trim() || courierToEdit.coverageZones,
      vehicleType: formVehicle,
      defaultDeliveryFee: formFee,
      status: formStatus
    });

    setCourierToEdit(null);
  };

  const filteredCouriers = useMemo(() => {
    return couriers.filter(c => {
      const matchSearch =
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone.includes(searchTerm) ||
        (c.zone && c.zone.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (c.coverageZones && c.coverageZones.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchStatus = statusFilter === 'all' || c.status === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [couriers, searchTerm, statusFilter]);

  const totalCustodyAll = useMemo(() => {
    return couriers.reduce((sum, c) => sum + (c.currentCustodyBalance || 0), 0);
  }, [couriers]);

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="البحث بالاسم، الكود، الهاتف، أو المنطقة..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pr-9 pl-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-amber-400"
            />
          </div>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700"
          >
            <option value="all">كافة الحالات</option>
            <option value="available">متاح للتوصيل</option>
            <option value="on_delivery">في مهمة توصيل</option>
            <option value="active">نشط</option>
            <option value="inactive">غير نشط</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          {totalCustodyAll > 0 && (
            <button
              onClick={() => setIsClearAllCustodiesModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>حذف وتصفير كافة العهد ({totalCustodyAll.toLocaleString()} ر.ي)</span>
            </button>
          )}

          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-600 text-white shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة موصل جديد</span>
          </button>
        </div>
      </div>

      {/* Couriers Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCouriers.map(courier => {
          const courierOrders = deliveryOrders.filter(o => o.courierId === courier.id);
          const activeOrdersCount = courierOrders.filter(o => o.status === 'out_for_delivery' || o.status === 'received_by_courier').length;

          return (
            <div
              key={courier.id}
              className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:border-amber-300 transition-all p-5 flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center font-bold">
                      <Bike className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-900 text-sm">{courier.name}</h3>
                        <span className="text-[10px] px-2 py-0.5 rounded-md font-mono bg-slate-100 text-slate-600">
                          {courier.code}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                        <span className="flex items-center gap-1 font-mono">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {courier.phone || 'بدون هاتف'}
                        </span>
                        {courier.zone && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            {courier.zone}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] px-2.5 py-1 rounded-full font-bold flex items-center gap-1 ${
                      courier.status === 'available' || courier.status === 'active'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : courier.status === 'on_delivery'
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        courier.status === 'available' || courier.status === 'active'
                          ? 'bg-emerald-500'
                          : courier.status === 'on_delivery'
                          ? 'bg-blue-500'
                          : 'bg-slate-400'
                      }`}
                    />
                    {courier.status === 'available' ? 'متاح' : courier.status === 'on_delivery' ? 'في مهمة' : courier.status === 'active' ? 'نشط' : 'متوقف'}
                  </span>
                </div>

                {/* Balances & Orders Summary */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                  <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100">
                    <span className="text-[10px] text-slate-500 block">عهدة النقدية الحالية</span>
                    <span
                      className={`text-sm font-black font-mono ${
                        (courier.currentCustodyBalance || 0) > 0 ? 'text-amber-600' : 'text-slate-700'
                      }`}
                    >
                      {(courier.currentCustodyBalance || 0).toLocaleString()} ر.ي
                    </span>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100">
                    <span className="text-[10px] text-slate-500 block">إجمالي المسلّم</span>
                    <span className="text-sm font-black font-mono text-emerald-600">
                      {courier.deliveredOrdersCount || 0} طلب
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 bg-amber-50/50 px-3 py-1.5 rounded-lg border border-amber-100/60">
                  <span>
                    أجرة التوصيل الافتراضية:{' '}
                    <strong className="text-amber-900">
                      {(courier.defaultDeliveryFee || 0).toLocaleString()} ر.ي
                    </strong>
                  </span>
                  {activeOrdersCount > 0 && (
                    <span className="text-blue-600 font-bold">نشط الآن: {activeOrdersCount}</span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => onOpenReceiveCashFromCourier(courier)}
                    className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold border border-emerald-200 transition-colors cursor-pointer"
                  >
                    <Wallet className="w-3.5 h-3.5" />
                    <span>تحصيل نقدية</span>
                  </button>
                  <button
                    onClick={() => onOpenSettlementForCourier(courier)}
                    className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold border border-blue-200 transition-colors cursor-pointer"
                  >
                    <DollarSign className="w-3.5 h-3.5" />
                    <span>تسوية أجر</span>
                  </button>
                </div>

                <div className="flex items-center justify-between gap-1 pt-1">
                  <button
                    onClick={() => setSelectedProfileCourier(courier)}
                    className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>الملف الشامل</span>
                  </button>

                  <button
                    onClick={() => openEditModal(courier)}
                    className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                    title="تعديل الموصل"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  {(courier.currentCustodyBalance || 0) > 0 && (
                    <button
                      onClick={() => setCourierToClearCustody(courier)}
                      className="p-1.5 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                      title="تصفير العهدة"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    onClick={() => setCourierToDelete(courier)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                    title="حذف الموصل"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredCouriers.length === 0 && (
        <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center">
          <Bike className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h4 className="text-sm font-bold text-slate-700 mb-1">لا يوجد موصلين يطابقون البحث</h4>
          <p className="text-xs text-slate-400 mb-4">يمكنك إضافة موصل جديد أو تغيير معايير البحث والفلترة.</p>
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة موصل الآن</span>
          </button>
        </div>
      )}

      {/* Courier Profile Modal */}
      {selectedProfileCourier && (
        <CourierProfileModal
          courier={selectedProfileCourier}
          onClose={() => setSelectedProfileCourier(null)}
          onOpenSettlementForCourier={onOpenSettlementForCourier}
          onOpenReceiveCashFromCourier={onOpenReceiveCashFromCourier}
        />
      )}

      {/* Add Courier Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100">
            <h3 className="text-base font-black text-slate-900 mb-4 flex items-center gap-2">
              <Bike className="w-5 h-5 text-amber-500" />
              <span>إضافة موصل / مندوب جديد</span>
            </h3>

            <form onSubmit={handleSaveAdd} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">الاسم الكامل *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="مثال: أيمن القدسي"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">رقم الهاتف</label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={e => setFormPhone(e.target.value)}
                    placeholder="770000000"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">المنطقة الرئيسية</label>
                  <input
                    type="text"
                    value={formZone}
                    onChange={e => setFormZone(e.target.value)}
                    placeholder="مثال: حدة"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">مناطق التغطية بالتفصيل</label>
                <input
                  type="text"
                  value={formCoverage}
                  onChange={e => setFormCoverage(e.target.value)}
                  placeholder="مثال: صنعاء - حدة، الستين، الصافية"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">وسيلة النقل</label>
                  <select
                    value={formVehicle}
                    onChange={e => setFormVehicle(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-amber-400 text-slate-700"
                  >
                    <option value="دراجة نارية">دراجة نارية</option>
                    <option value="سيارة">سيارة</option>
                    <option value="دباب">دباب</option>
                    <option value="مكتب نقل">مكتب نقل</option>
                    <option value="أخرى">أخرى</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">أجرة التوصيل الافتراضية (ر.ي)</label>
                  <input
                    type="number"
                    value={formFee}
                    onChange={e => setFormFee(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">الحالة التشغيلية</label>
                <select
                  value={formStatus}
                  onChange={e => setFormStatus(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-amber-400 text-slate-700"
                >
                  <option value="available">متاح للتوصيل</option>
                  <option value="on_delivery">في مهمة توصيل</option>
                  <option value="active">نشط</option>
                  <option value="inactive">غير نشط</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  إضافة الموصل
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Courier Modal */}
      {courierToEdit && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100">
            <h3 className="text-base font-black text-slate-900 mb-4 flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-amber-500" />
              <span>تعديل بيانات الموصل: {courierToEdit.name}</span>
            </h3>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">الاسم الكامل *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">رقم الهاتف</label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={e => setFormPhone(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">المنطقة الرئيسية</label>
                  <input
                    type="text"
                    value={formZone}
                    onChange={e => setFormZone(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">مناطق التغطية بالتفصيل</label>
                <input
                  type="text"
                  value={formCoverage}
                  onChange={e => setFormCoverage(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">وسيلة النقل</label>
                  <select
                    value={formVehicle}
                    onChange={e => setFormVehicle(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-amber-400 text-slate-700"
                  >
                    <option value="دراجة نارية">دراجة نارية</option>
                    <option value="سيارة">سيارة</option>
                    <option value="دباب">دباب</option>
                    <option value="مكتب نقل">مكتب نقل</option>
                    <option value="أخرى">أخرى</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">أجرة التوصيل الافتراضية (ر.ي)</label>
                  <input
                    type="number"
                    value={formFee}
                    onChange={e => setFormFee(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">الحالة التشغيلية</label>
                <select
                  value={formStatus}
                  onChange={e => setFormStatus(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-amber-400 text-slate-700"
                >
                  <option value="available">متاح للتوصيل</option>
                  <option value="on_delivery">في مهمة توصيل</option>
                  <option value="active">نشط</option>
                  <option value="inactive">غير نشط</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCourierToEdit(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  حفظ التعديلات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Courier Confirmation */}
      {courierToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-100 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h4 className="text-base font-black text-slate-900 mb-1">تأكيد حذف الموصل</h4>
            <p className="text-xs text-slate-600 mb-4">
              هل أنت متأكد من حذف الموصل <strong>{courierToDelete.name}</strong>؟ سيتم فك ارتباط أي طلبات حالية مسندة إليه.
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setCourierToDelete(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                إلغاء
              </button>
              <button
                onClick={() => {
                  deleteCourier(courierToDelete.id);
                  setCourierToDelete(null);
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                تأكيد الحذف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear Single Courier Custody Confirmation */}
      {courierToClearCustody && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-100 text-center">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-3">
              <RefreshCw className="w-6 h-6" />
            </div>
            <h4 className="text-base font-black text-slate-900 mb-1">تصفير عهدة الموصل</h4>
            <p className="text-xs text-slate-600 mb-4">
              هل تريد تصفير وحذف عهدة الموصل <strong>{courierToClearCustody.name}</strong> البالغة{' '}
              <strong className="text-amber-600">{(courierToClearCustody.currentCustodyBalance || 0).toLocaleString()} ر.ي</strong>؟
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setCourierToClearCustody(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                إلغاء
              </button>
              <button
                onClick={() => {
                  clearCourierCustody(courierToClearCustody.id);
                  setCourierToClearCustody(null);
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                تأكيد تصفير العهدة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear All Custodies Confirmation */}
      {isClearAllCustodiesModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-100 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h4 className="text-base font-black text-slate-900 mb-1">حذف وتصفير كافة العهد</h4>
            <p className="text-xs text-slate-600 mb-4">
              هل أنت متأكد من تصفير كافة عهد الموصلين الحالية بقيمة إجمالية{' '}
              <strong className="text-red-600">{totalCustodyAll.toLocaleString()} ر.ي</strong> لتصبح صفراً في النظام؟
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setIsClearAllCustodiesModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                إلغاء
              </button>
              <button
                onClick={() => {
                  clearAllCourierCustodies();
                  setIsClearAllCustodiesModalOpen(false);
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                نعم، تصفير كافة العهد
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
