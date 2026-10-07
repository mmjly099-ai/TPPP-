import React, { useState, useMemo } from 'react';
import {
  Bike,
  Truck,
  Car,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Phone,
  MessageSquare,
  Printer,
  Calendar,
  Wallet,
  DollarSign,
  Package,
  MapPin,
  ChevronDown,
  ChevronUp,
  Edit,
  Trash2,
  ExternalLink,
  ShieldAlert,
  ArrowRightLeft,
  FileSpreadsheet,
  CheckSquare,
  Square,
  UserCheck,
  Send,
  Navigation
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { Courier, DeliveryTrip, DeliveryTripItem, Order } from '../types';

export const CouriersView: React.FC = () => {
  const {
    couriers,
    deliveryTrips,
    orders,
    customers,
    accounts,
    addCourier,
    updateCourier,
    deleteCourier,
    createDeliveryTrip,
    settleDeliveryTrip,
    cancelDeliveryTrip,
    deleteDeliveryTrip
  } = useStore();

  // Active view tab inside Couriers system: 'trips' | 'couriers' | 'settlement_history'
  const [activeSubTab, setActiveSubTab] = useState<'trips' | 'couriers' | 'history'>('trips');

  // Search & filter
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedCourierId, setSelectedCourierId] = useState<number | 'all'>('all');

  // Modals state
  const [isNewCourierModalOpen, setIsNewCourierModalOpen] = useState(false);
  const [editingCourier, setEditingCourier] = useState<Courier | null>(null);
  const [isNewTripModalOpen, setIsNewTripModalOpen] = useState(false);
  const [settlingTrip, setSettlingTrip] = useState<DeliveryTrip | null>(null);
  const [printingTrip, setPrintingTrip] = useState<DeliveryTrip | null>(null);
  const [viewingCourierLedger, setViewingCourierLedger] = useState<Courier | null>(null);

  // Form states for New / Edit Courier
  const [courierFormData, setCourierFormData] = useState({
    name: '',
    phone: '',
    vehicleType: 'دراجة نارية' as const,
    coverageZones: '',
    defaultDeliveryFee: 1500,
    status: 'available' as const,
    notes: ''
  });

  // Form states for New Delivery Trip
  const [selectedTripCourierId, setSelectedTripCourierId] = useState<number>(couriers[0]?.id || 0);
  const [tripDate, setTripDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [tripNotes, setTripNotes] = useState<string>('');
  const [selectedOrderIds, setSelectedOrderIds] = useState<number[]>([]);
  const [orderSearchTerm, setOrderSearchTerm] = useState<string>('');

  // Form states for Settling Trip
  const [settlementItems, setSettlementItems] = useState<{
    orderId: number;
    status: 'delivered' | 'returned' | 'postponed';
    collectedAmount: number;
    deliveryFeeCollected: boolean;
    notes: string;
  }[]>([]);
  const [depositAccountId, setDepositAccountId] = useState<number>(accounts[0]?.id || 0);
  const [courierCommissionPaid, setCourierCommissionPaid] = useState<number>(0);
  const [settlementNotes, setSettlementNotes] = useState<string>('');

  // ----------------------------------------------------
  // Computations & KPI Statistics
  // ----------------------------------------------------
  const stats = useMemo(() => {
    const totalCouriers = couriers.length;
    const availableCouriers = couriers.filter(c => c.status === 'available').length;
    const activeTrips = (deliveryTrips || []).filter(t => t.status === 'in_progress').length;
    
    // Total cash custody in couriers' hands
    const totalCustody = couriers.reduce((sum, c) => sum + (Number(c.currentCustodyBalance) || 0), 0);
    
    // Total cash remitted to store across all settled trips
    const settledTrips = (deliveryTrips || []).filter(t => t.status === 'settled');
    const totalNetDeposited = settledTrips.reduce((sum, t) => sum + (Number(t.netDepositedToStore) || 0), 0);
    const totalDeliveredOrders = settledTrips.reduce((sum, t) => sum + (Number(t.deliveredCount) || 0), 0);
    const totalCommissionsEarned = settledTrips.reduce((sum, t) => sum + (Number(t.courierCommissionTotal) || 0), 0);

    return {
      totalCouriers,
      availableCouriers,
      activeTrips,
      totalCustody,
      totalNetDeposited,
      totalDeliveredOrders,
      totalCommissionsEarned
    };
  }, [couriers, deliveryTrips]);

  // Filtered trips
  const filteredTrips = useMemo(() => {
    return (deliveryTrips || []).filter(trip => {
      const matchSearch =
        trip.tripNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        trip.courierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (trip.notes && trip.notes.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchStatus =
        statusFilter === 'all' ? true : trip.status === statusFilter;

      const matchCourier =
        selectedCourierId === 'all' ? true : trip.courierId === selectedCourierId;

      return matchSearch && matchStatus && matchCourier;
    });
  }, [deliveryTrips, searchTerm, statusFilter, selectedCourierId]);

  // Ready orders available for dispatching in a new trip
  // (orders not delivered yet and not cancelled, and not already on an active trip)
  const activeTripOrderIds = useMemo(() => {
    const ids = new Set<number>();
    (deliveryTrips || []).forEach(t => {
      if (t.status === 'in_progress') {
        t.items.forEach(i => ids.add(i.orderId));
      }
    });
    return ids;
  }, [deliveryTrips]);

  const dispatchableOrders = useMemo(() => {
    return orders.filter(o => {
      if (o.status === 'delivered' || o.status === 'cancelled') return false;
      if (activeTripOrderIds.has(o.id)) return false;
      return true;
    });
  }, [orders, activeTripOrderIds]);

  const filteredDispatchableOrders = useMemo(() => {
    if (!orderSearchTerm.trim()) return dispatchableOrders;
    const term = orderSearchTerm.toLowerCase();
    return dispatchableOrders.filter(o => {
      const cust = customers.find(c => c.id === o.customerId);
      return (
        String(o.orderNumber).toLowerCase().includes(term) ||
        (o.customerName && o.customerName.toLowerCase().includes(term)) ||
        (cust?.phone && cust.phone.includes(term)) ||
        (cust?.governorate && cust.governorate.toLowerCase().includes(term)) ||
        (cust?.city && cust.city.toLowerCase().includes(term)) ||
        (cust?.pickupLocation && cust.pickupLocation.toLowerCase().includes(term))
      );
    });
  }, [dispatchableOrders, orderSearchTerm, customers]);

  // Selected orders summary for new trip
  const newTripSummary = useMemo(() => {
    const selectedCourier = couriers.find(c => c.id === selectedTripCourierId);
    let totalRemaining = 0;
    let totalDeliveryFees = 0;

    selectedOrderIds.forEach(id => {
      const ord = orders.find(o => o.id === id);
      if (ord) {
        totalRemaining += Math.max(0, ord.remainingAmount || 0);
        totalDeliveryFees += ord.deliveryFee || selectedCourier?.defaultDeliveryFee || 1500;
      }
    });

    return {
      orderCount: selectedOrderIds.length,
      totalRemaining,
      totalDeliveryFees,
      totalExpectedCash: totalRemaining + totalDeliveryFees,
      estimatedCommission: (selectedCourier?.defaultDeliveryFee || 1500) * selectedOrderIds.length
    };
  }, [selectedOrderIds, orders, selectedTripCourierId, couriers]);

  // ----------------------------------------------------
  // Handlers
  // ----------------------------------------------------
  const handleOpenAddCourier = () => {
    setCourierFormData({
      name: '',
      phone: '',
      vehicleType: 'دراجة نارية',
      coverageZones: '',
      defaultDeliveryFee: 1500,
      status: 'available',
      notes: ''
    });
    setIsNewCourierModalOpen(true);
  };

  const handleOpenEditCourier = (c: Courier) => {
    setEditingCourier(c);
    setCourierFormData({
      name: c.name,
      phone: c.phone,
      vehicleType: (c.vehicleType as any) || 'دراجة نارية',
      coverageZones: c.coverageZones,
      defaultDeliveryFee: c.defaultDeliveryFee || 1500,
      status: c.status,
      notes: c.notes || ''
    });
  };

  const handleSaveCourier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!courierFormData.name.trim() || !courierFormData.phone.trim()) return;

    if (editingCourier) {
      updateCourier({
        ...editingCourier,
        name: courierFormData.name.trim(),
        phone: courierFormData.phone.trim(),
        vehicleType: courierFormData.vehicleType,
        coverageZones: courierFormData.coverageZones.trim(),
        defaultDeliveryFee: Number(courierFormData.defaultDeliveryFee) || 1500,
        status: courierFormData.status,
        notes: courierFormData.notes.trim()
      });
      setEditingCourier(null);
    } else {
      addCourier({
        name: courierFormData.name.trim(),
        phone: courierFormData.phone.trim(),
        vehicleType: courierFormData.vehicleType,
        coverageZones: courierFormData.coverageZones.trim(),
        defaultDeliveryFee: Number(courierFormData.defaultDeliveryFee) || 1500,
        status: courierFormData.status,
        notes: courierFormData.notes.trim()
      });
      setIsNewCourierModalOpen(false);
    }
  };

  const handleDeleteCourier = (id: number) => {
    const courier = couriers.find(c => c.id === id);
    if (!courier) return;
    if ((courier.currentCustodyBalance || 0) > 0) {
      alert(`لا يمكن حذف الموصل "${courier.name}" لوجود عهدة نقدية معلقة في ذمته بمبلغ ${courier.currentCustodyBalance.toLocaleString()} ريال. يرجى تصفية الرحلات أولاً.`);
      return;
    }
    if (confirm(`هل أنت متأكد من حذف الموصل ${courier.name}؟`)) {
      deleteCourier(id);
    }
  };

  const handleOpenNewTrip = (preselectedCourierId?: number) => {
    if (couriers.length === 0) {
      alert('يرجى إضافة موصل أولاً قبل إنشاء رحلة التوصيل.');
      handleOpenAddCourier();
      return;
    }
    setSelectedTripCourierId(preselectedCourierId || couriers[0].id);
    setTripDate(new Date().toISOString().split('T')[0]);
    setTripNotes('');
    setSelectedOrderIds([]);
    setOrderSearchTerm('');
    setIsNewTripModalOpen(true);
  };

  const handleToggleSelectOrder = (orderId: number) => {
    setSelectedOrderIds(prev =>
      prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId]
    );
  };

  const handleSelectAllFilteredOrders = () => {
    const filteredIds = filteredDispatchableOrders.map(o => o.id);
    const allSelected = filteredIds.every(id => selectedOrderIds.includes(id));
    if (allSelected) {
      setSelectedOrderIds(prev => prev.filter(id => !filteredIds.includes(id)));
    } else {
      setSelectedOrderIds(prev => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  const handleCreateTrip = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTripCourierId) {
      alert('يرجى اختيار الموصل.');
      return;
    }
    if (selectedOrderIds.length === 0) {
      alert('يرجى تحديد طلبية واحدة على الأقل لإضافتها إلى رحلة التوصيل.');
      return;
    }

    createDeliveryTrip({
      courierId: selectedTripCourierId,
      date: tripDate,
      orderIds: selectedOrderIds,
      notes: tripNotes.trim()
    });

    setIsNewTripModalOpen(false);
  };

  const handleOpenSettleTrip = (trip: DeliveryTrip) => {
    setSettlingTrip(trip);
    // Initialize items
    const initialItems = trip.items.map(item => ({
      orderId: item.orderId,
      status: item.status === 'delivered' ? ('delivered' as const) : ('delivered' as const),
      collectedAmount: item.totalDueFromCustomer,
      deliveryFeeCollected: true,
      notes: item.notes || ''
    }));
    setSettlementItems(initialItems);
    setDepositAccountId(accounts[0]?.id || 0);
    setCourierCommissionPaid(trip.courierCommissionTotal || 0);
    setSettlementNotes(trip.notes || '');
  };

  const handleItemStatusChange = (orderId: number, status: 'delivered' | 'returned' | 'postponed') => {
    setSettlementItems(prev =>
      prev.map(i => {
        if (i.orderId !== orderId) return i;
        const tripItem = settlingTrip?.items.find(ti => ti.orderId === orderId);
        const defaultDue = tripItem?.totalDueFromCustomer || 0;
        return {
          ...i,
          status,
          collectedAmount: status === 'delivered' ? defaultDue : 0,
          deliveryFeeCollected: status === 'delivered'
        };
      })
    );
  };

  const handleItemCollectedAmountChange = (orderId: number, amt: number) => {
    setSettlementItems(prev =>
      prev.map(i => (i.orderId === orderId ? { ...i, collectedAmount: amt } : i))
    );
  };

  const handleItemNotesChange = (orderId: number, note: string) => {
    setSettlementItems(prev =>
      prev.map(i => (i.orderId === orderId ? { ...i, notes: note } : i))
    );
  };

  const computedSettlementTotal = useMemo(() => {
    const totalCollected = settlementItems.reduce((sum, i) => sum + (Number(i.collectedAmount) || 0), 0);
    const comm = Number(courierCommissionPaid) || 0;
    const netDeposit = Math.max(0, totalCollected - comm);
    const deliveredCount = settlementItems.filter(i => i.status === 'delivered').length;
    const returnedCount = settlementItems.filter(i => i.status === 'returned').length;
    const postponedCount = settlementItems.filter(i => i.status === 'postponed').length;

    return {
      totalCollected,
      comm,
      netDeposit,
      deliveredCount,
      returnedCount,
      postponedCount
    };
  }, [settlementItems, courierCommissionPaid]);

  const handleConfirmSettlement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!settlingTrip) return;
    if (!depositAccountId) {
      alert('يرجى اختيار الصندوق أو الحساب البنكي لتوريد النقدية.');
      return;
    }

    settleDeliveryTrip(settlingTrip.id, {
      items: settlementItems,
      depositAccountId,
      courierCommissionPaid: Number(courierCommissionPaid) || 0,
      notes: settlementNotes.trim()
    });

    setSettlingTrip(null);
  };

  const handleSendWhatsAppManifest = (trip: DeliveryTrip) => {
    const courier = couriers.find(c => c.id === trip.courierId);
    let msg = `*كشف رحلة توصيل طلبيات - متجر TOP STORE*\n`;
    msg += `رقم الرحلة: ${trip.tripNumber}\n`;
    msg += `الموصل: ${trip.courierName}\n`;
    msg += `التاريخ: ${trip.date}\n`;
    msg += `عدد الطلبيات: ${trip.items.length}\n`;
    msg += `إجمالي المبلغ المطلوب تحصيله: ${trip.totalExpectedCash.toLocaleString()} ريال\n`;
    msg += `------------------------------------\n`;

    trip.items.forEach((item, idx) => {
      msg += `*${idx + 1}. طلب #${item.orderNumber}*\n`;
      msg += `👤 العميل: ${item.customerName}\n`;
      msg += `📱 الهاتف: ${item.customerPhone}\n`;
      msg += `📍 العنوان: ${item.customerAddress || 'صنعاء'}\n`;
      msg += `💰 المبلغ المطلوب (COD): ${item.totalDueFromCustomer.toLocaleString()} ريال\n`;
      if (item.notes) msg += `📝 ملاحظات: ${item.notes}\n`;
      msg += `------------------------------------\n`;
    });

    msg += `بالتوفيق والرجاء التأكد من استلام المبالغ كاملة وتوقيع العميل.`;

    const encoded = encodeURI(msg);
    const phoneClean = (courier?.phone || '').replace(/[^0-9]/g, '');
    const url = phoneClean ? `https://wa.me/${phoneClean}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
    window.open(url, '_blank');
  };

  const getVehicleBadge = (type?: string) => {
    switch (type) {
      case 'دراجة نارية':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Bike className="w-3.5 h-3.5" /> دراجة نارية
          </span>
        );
      case 'سيارة':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Car className="w-3.5 h-3.5" /> سيارة
          </span>
        );
      case 'مكتب نقل':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            <Truck className="w-3.5 h-3.5" /> مكتب نقل ومحافظات
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            <Bike className="w-3.5 h-3.5" /> {type || 'مندوب'}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header Card */}
      <div className="bg-gradient-to-l from-blue-700 via-indigo-700 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-500/10 rounded-full blur-2xl -ml-20 -mb-20 pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-blue-200 text-xs font-medium border border-white/10">
              <Bike className="w-4 h-4 text-blue-300" />
              <span>نظام إدارة الموصلين ومناديب التوزيع والتحصيلات COD</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              إدارة الموصلين ورحلات التوزيع
            </h1>
            <p className="text-blue-100 text-sm leading-relaxed">
              توزيع طلبيات العملاء على مناديب التوصيل ومكاتب النقل، متابعة العهد النقدية المحصلة عند الاستلام، إنشاء كشوفات التسليم، وتصفية وتوريد النقدية آلياً مع القيود المحاسبية وسندات القبض.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <button
              onClick={() => handleOpenNewTrip()}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm shadow-lg hover:shadow-xl transition-all transform active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>إنشاء رحلة توصيل جديدة</span>
            </button>
            <button
              onClick={handleOpenAddCourier}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm border border-white/20 backdrop-blur-md transition-all cursor-pointer"
            >
              <UserCheck className="w-4 h-4 text-blue-300" />
              <span>إضافة موصل جديد</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Couriers */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">الموصلين المسجلين</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Bike className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-800">{stats.totalCouriers}</span>
            <span className="text-xs text-emerald-600 font-semibold">
              ({stats.availableCouriers} متاح الآن)
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-400">
            مناديب توصيل ومكاتب نقل معتمدة
          </div>
        </div>

        {/* In-Progress Trips */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">رحلات التوصيل الجارية</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-700">{stats.activeTrips}</span>
            <span className="text-xs text-amber-600 font-semibold">رحلة نشطة</span>
          </div>
          <div className="mt-2 text-xs text-slate-400">
            طلبات قيد التوزيع حالياً في الطريق
          </div>
        </div>

        {/* Current Custody in Couriers Hands */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">عهدة نقدية في ذمة المناديب</span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="text-2xl font-black text-purple-700">{stats.totalCustody.toLocaleString()}</span>
            <span className="text-xs font-bold text-purple-600">ريال</span>
          </div>
          <div className="mt-2 text-xs text-slate-400">
            تحصيلات COD بانتظار التوريد والتصفية
          </div>
        </div>

        {/* Total Remitted to Store */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">إجمالي المبالغ الموردة للمتجر</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="text-2xl font-black text-emerald-700">{stats.totalNetDeposited.toLocaleString()}</span>
            <span className="text-xs font-bold text-emerald-600">ريال</span>
          </div>
          <div className="mt-2 text-xs text-slate-400">
            تم تسليم {stats.totalDeliveredOrders} طلب بنجاح
          </div>
        </div>

      </div>

      {/* Main Tabs Navigation */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setActiveSubTab('trips')}
            className={`px-4 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer shrink-0 flex items-center gap-2 ${
              activeSubTab === 'trips'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>رحلات التوصيل والتوزيع</span>
            <span className={`px-2 py-0.5 rounded-full text-xs ${
              activeSubTab === 'trips' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
            }`}>
              {(deliveryTrips || []).length}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('couriers')}
            className={`px-4 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer shrink-0 flex items-center gap-2 ${
              activeSubTab === 'couriers'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            <Bike className="w-4 h-4" />
            <span>سجل الموصلين والمناديب</span>
            <span className={`px-2 py-0.5 rounded-full text-xs ${
              activeSubTab === 'couriers' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
            }`}>
              {couriers.length}
            </span>
          </button>
        </div>

        {/* Quick Search & Filters Bar */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="بحث برقم الرحلة، اسم الموصل..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-3 pr-9 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {activeSubTab === 'trips' && (
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl text-xs sm:text-sm px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="all">كل الحالات</option>
              <option value="in_progress">جارية (قيد التوصيل)</option>
              <option value="settled">تمت التصفية والتوريد</option>
              <option value="cancelled">ملغاة</option>
            </select>
          )}
        </div>

      </div>

      {/* ======================================================== */}
      {/* SUB-TAB 1: DELIVERY TRIPS (رحلات التوصيل)                */}
      {/* ======================================================== */}
      {activeSubTab === 'trips' && (
        <div className="space-y-4">
          
          {filteredTrips.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center mx-auto">
                <Bike className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">لا توجد رحلات توصيل مسجلة حالياً</h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto">
                قم بإنشاء رحلة توصيل وتوزيع الطلبيات المجمعة على الموصلين لطباعة كشوفات التسليم وتتبع المبالغ المحصلة عند الاستلام COD.
              </p>
              <button
                onClick={() => handleOpenNewTrip()}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>إنشاء أول رحلة توصيل</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredTrips.map(trip => {
                const isSettled = trip.status === 'settled';
                const isCancelled = trip.status === 'cancelled';
                const isInProgress = trip.status === 'in_progress';

                return (
                  <div
                    key={trip.id}
                    className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition-all space-y-4"
                  >
                    {/* Trip Card Header */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-base ${
                          isSettled
                            ? 'bg-emerald-50 text-emerald-600'
                            : isCancelled
                            ? 'bg-slate-100 text-slate-500'
                            : 'bg-amber-50 text-amber-600'
                        }`}>
                          <Navigation className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-extrabold text-slate-800 text-base">{trip.tripNumber}</h4>
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                              isSettled
                                ? 'bg-emerald-100 text-emerald-800'
                                : isCancelled
                                ? 'bg-slate-100 text-slate-600'
                                : 'bg-amber-100 text-amber-800 animate-pulse'
                            }`}>
                              {isSettled ? 'تمت التصفية والتوريد' : isCancelled ? 'ملغاة' : 'قيد التوصيل الآن'}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 flex items-center gap-3 mt-1">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              {trip.date}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1 font-semibold text-slate-700">
                              <Bike className="w-3.5 h-3.5 text-blue-500" />
                              الموصل: {trip.courierName} ({trip.courierPhone})
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Quick Actions on Trip */}
                      <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
                        
                        {/* WhatsApp Run-Sheet */}
                        <button
                          onClick={() => handleSendWhatsAppManifest(trip)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold border border-emerald-200 transition-colors cursor-pointer"
                          title="إرسال كشف العناوين والطلبيات عبر واتساب للموصل"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>إرسال واتساب</span>
                        </button>

                        {/* Print Run-sheet */}
                        <button
                          onClick={() => setPrintingTrip(trip)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                          title="طباعة كشف تسليم الطلبيات الرسمي"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>طباعة كشف التسليم</span>
                        </button>

                        {/* Settle Trip Button */}
                        {isInProgress && (
                          <button
                            onClick={() => handleOpenSettleTrip(trip)}
                            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                          >
                            <ArrowRightLeft className="w-3.5 h-3.5" />
                            <span>تصفية ومحاسبة الرحلة</span>
                          </button>
                        )}

                        {/* Cancel Trip Button */}
                        {isInProgress && (
                          <button
                            onClick={() => {
                              if (confirm(`هل أنت متأكد من إلغاء رحلة التوصيل #${trip.tripNumber} وإعادة الطلبات إلى قائمة الانتظار؟`)) {
                                cancelDeliveryTrip?.(trip.id);
                              }
                            }}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="إلغاء الرحلة"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}

                        {/* Delete Trip */}
                        {isCancelled && (
                          <button
                            onClick={() => {
                              if (confirm(`هل تريد حذف الرحلة الملغاة #${trip.tripNumber} نهائياً؟`)) {
                                deleteDeliveryTrip?.(trip.id);
                              }
                            }}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="حذف الرحلة"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}

                      </div>
                    </div>

                    {/* Trip Financial & Orders Summary Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 rounded-xl p-3 border border-slate-100 text-xs">
                      <div>
                        <span className="text-slate-400 block mb-0.5">عدد الطلبيات</span>
                        <div className="font-extrabold text-slate-800 text-sm">
                          {trip.totalOrdersCount} طلبات
                          {isSettled && (
                            <span className="text-emerald-600 font-normal mr-1">
                              (تم تسليم {trip.deliveredCount})
                            </span>
                          )}
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-400 block mb-0.5">المبلغ المتوقع تحصيله (COD)</span>
                        <div className="font-extrabold text-amber-700 text-sm">
                          {trip.totalExpectedCash.toLocaleString()} <span className="text-xs font-normal">ريال</span>
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-400 block mb-0.5">المبلغ المحصل فعلياً</span>
                        <div className={`font-extrabold text-sm ${isSettled ? 'text-emerald-700' : 'text-slate-500'}`}>
                          {isSettled ? `${trip.totalCollectedCash.toLocaleString()} ريال` : 'قيد التحصيل...'}
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-400 block mb-0.5">الصافي المورد للخزينة</span>
                        <div className={`font-extrabold text-sm ${isSettled ? 'text-blue-700' : 'text-slate-500'}`}>
                          {isSettled ? (
                            <span>{trip.netDepositedToStore.toLocaleString()} ريال ({trip.depositAccountName})</span>
                          ) : (
                            'يحدد عند التصفية'
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Trip Items Collapsible / Detailed List */}
                    <div className="space-y-2">
                      <div className="text-xs font-bold text-slate-600 flex items-center justify-between">
                        <span>قائمة طلبيات الرحلة ({trip.items.length}):</span>
                        <span className="text-slate-400 text-[11px]">
                          أجور الموصل المستحقة: {(trip.courierCommissionTotal || 0).toLocaleString()} ريال
                        </span>
                      </div>

                      <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                        {trip.items.map((item, idx) => (
                          <div
                            key={idx}
                            className="p-3 bg-white hover:bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                          >
                            <div className="flex items-start gap-2.5">
                              <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 font-bold flex items-center justify-center shrink-0 text-[11px]">
                                {idx + 1}
                              </span>
                              <div>
                                <div className="font-bold text-slate-800 flex items-center gap-2">
                                  <span>طلب #{item.orderNumber}</span>
                                  <span className="text-slate-400">•</span>
                                  <span className="text-blue-700">{item.customerName}</span>
                                  <span className="text-slate-500 text-[11px] font-normal" dir="ltr">
                                    {item.customerPhone}
                                  </span>
                                </div>
                                <div className="text-slate-500 text-[11px] flex items-center gap-1 mt-0.5">
                                  <MapPin className="w-3 h-3 text-slate-400" />
                                  <span>{item.customerAddress || 'صنعاء'}</span>
                                  {item.notes && <span className="text-amber-600 mr-2">({item.notes})</span>}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center justify-between sm:justify-end gap-4 mr-7 sm:mr-0">
                              <div className="text-left sm:text-right">
                                <span className="text-slate-400 block text-[10px]">المطلوب (باقي الطلب + توصيل)</span>
                                <span className="font-extrabold text-slate-800">
                                  {item.totalDueFromCustomer.toLocaleString()} ريال
                                </span>
                              </div>

                              <span className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${
                                item.status === 'delivered'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : item.status === 'returned'
                                  ? 'bg-rose-100 text-rose-800'
                                  : item.status === 'postponed'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-slate-100 text-slate-600'
                              }`}>
                                {item.status === 'delivered'
                                  ? 'تم التسليم'
                                  : item.status === 'returned'
                                  ? 'مرتجع'
                                  : item.status === 'postponed'
                                  ? 'مؤجل'
                                  : 'بانتظار التسليم'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Settlement Notes or Footnote */}
                    {trip.notes && (
                      <div className="text-xs text-slate-500 bg-slate-50 rounded-xl p-2.5 border border-slate-100">
                        <span className="font-bold text-slate-600">ملاحظات الرحلة: </span>
                        {trip.notes}
                      </div>
                    )}

                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}

      {/* ======================================================== */}
      {/* SUB-TAB 2: COURIERS REGISTRY (سجل الموصلين والمناديب)     */}
      {/* ======================================================== */}
      {activeSubTab === 'couriers' && (
        <div className="space-y-4">
          
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-800">
              قائمة مناديب ومكاتب التوصيل المعتمدة ({couriers.length})
            </h3>
            <button
              onClick={handleOpenAddCourier}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة موصل جديد</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {couriers.map(courier => {
              const activeCourierTrips = (deliveryTrips || []).filter(
                t => t.courierId === courier.id && t.status === 'in_progress'
              ).length;
              const hasCustody = (courier.currentCustodyBalance || 0) > 0;

              return (
                <div
                  key={courier.id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    
                    {/* Header info */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-sm">
                          {courier.code}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-800 text-sm leading-tight">
                            {courier.name}
                          </h4>
                          <div className="flex items-center gap-1 text-xs text-slate-500 mt-1" dir="ltr">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{courier.phone}</span>
                          </div>
                        </div>
                      </div>

                      {getVehicleBadge(courier.vehicleType)}
                    </div>

                    {/* Coverage Zones */}
                    <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100 text-xs text-slate-600 space-y-1">
                      <div className="font-semibold text-slate-700 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-blue-500" />
                        <span>مناطق التغطية والتوزيع:</span>
                      </div>
                      <p className="text-slate-600 text-[11px] leading-relaxed">
                        {courier.coverageZones || 'صنعاء - جميع المناطق'}
                      </p>
                    </div>

                    {/* Custody & Statistics */}
                    <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                      <div className={`p-2.5 rounded-xl border ${
                        hasCustody
                          ? 'bg-purple-50/70 border-purple-200 text-purple-900'
                          : 'bg-slate-50 border-slate-100 text-slate-700'
                      }`}>
                        <span className="text-[10px] text-slate-500 block mb-0.5">العهدة النقدية الحالية</span>
                        <span className="font-extrabold text-sm">
                          {(courier.currentCustodyBalance || 0).toLocaleString()} <span className="text-[10px] font-normal">ريال</span>
                        </span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-slate-700">
                        <span className="text-[10px] text-slate-500 block mb-0.5">أجرة التوصيل الافتراضية</span>
                        <span className="font-extrabold text-sm">
                          {(courier.defaultDeliveryFee || 1500).toLocaleString()} <span className="text-[10px] font-normal">ريال</span>
                        </span>
                      </div>
                    </div>

                    {/* Status badge & active trips */}
                    <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        courier.status === 'available'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : courier.status === 'on_delivery'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          courier.status === 'available' ? 'bg-emerald-500' : 'bg-amber-500'
                        }`} />
                        {courier.status === 'available' ? 'متاح للتكليف' : courier.status === 'on_delivery' ? 'في رحلة توصيل' : 'غير نشط'}
                      </span>

                      <span className="text-slate-400 text-[11px]">
                        تم تسليم {courier.deliveredOrdersCount || 0} طلب
                      </span>
                    </div>

                  </div>

                  {/* Courier Card Footer Actions */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      onClick={() => handleOpenNewTrip(courier.id)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>بدء رحلة جديدة</span>
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditCourier(courier)}
                        className="p-2 rounded-xl text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                        title="تعديل بيانات الموصل"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteCourier(courier.id)}
                        className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
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

        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 1: ADD / EDIT COURIER                              */}
      {/* ======================================================== */}
      {(isNewCourierModalOpen || editingCourier) && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">
                    {editingCourier ? 'تعديل بيانات الموصل' : 'تسجيل موصل / مندوب جديد'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    أدخل بيانات مندوب التوصيل ومناطق تغطيته وأجور التوصيل
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setIsNewCourierModalOpen(false);
                  setEditingCourier(null);
                }}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCourier} className="space-y-4">
              
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  اسم الموصل أو مكتب النقل *
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: محمد الشامي، مكتب المهيب للنقل"
                  value={courierFormData.name}
                  onChange={e => setCourierFormData({ ...courierFormData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    رقم الهاتف / واتساب *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="771234567"
                    value={courierFormData.phone}
                    onChange={e => setCourierFormData({ ...courierFormData, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    وسيلة النقل
                  </label>
                  <select
                    value={courierFormData.vehicleType}
                    onChange={e => setCourierFormData({ ...courierFormData, vehicleType: e.target.value as any })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="دراجة نارية">دراجة نارية (موتور)</option>
                    <option value="سيارة">سيارة</option>
                    <option value="دباب">دباب</option>
                    <option value="مكتب نقل">مكتب نقل ومحافظات</option>
                    <option value="أخرى">أخرى</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    أجرة التوصيل الافتراضية (ريال)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={courierFormData.defaultDeliveryFee}
                    onChange={e => setCourierFormData({ ...courierFormData, defaultDeliveryFee: Number(e.target.value) || 0 })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    حالة الموصل
                  </label>
                  <select
                    value={courierFormData.status}
                    onChange={e => setCourierFormData({ ...courierFormData, status: e.target.value as any })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="available">متاح للرحلات</option>
                    <option value="on_delivery">في رحلة توصيل</option>
                    <option value="inactive">غير نشط</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  نطاق التغطية والمناطق
                </label>
                <input
                  type="text"
                  placeholder="مثال: صنعاء - حدة، عصر، الستين الجنوبي، الأصبحي"
                  value={courierFormData.coverageZones}
                  onChange={e => setCourierFormData({ ...courierFormData, coverageZones: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ملاحظات إضافية
                </label>
                <textarea
                  rows={2}
                  placeholder="أي ملاحظات حول الموصل أو أوقات دوامه..."
                  value={courierFormData.notes}
                  onChange={e => setCourierFormData({ ...courierFormData, notes: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsNewCourierModalOpen(false);
                    setEditingCourier(null);
                  }}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-colors cursor-pointer"
                >
                  {editingCourier ? 'حفظ التعديلات' : 'تسجيل الموصل'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: CREATE DELIVERY TRIP (إنشاء رحلة توصيل وتوزيع)    */}
      {/* ======================================================== */}
      {isNewTripModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Navigation className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">
                    إنشاء رحلة توصيل وتوزيع الطلبيات
                  </h3>
                  <p className="text-xs text-slate-400">
                    حدد الموصل والطلبيات الجاهزة للتسليم لحساب العهدة النقدية COD وطباعة الكشف
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsNewTripModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Courier & Date Selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 rounded-2xl p-4 border border-slate-100">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  اختر الموصل أو مندوب التوزيع *
                </label>
                <select
                  value={selectedTripCourierId}
                  onChange={e => setSelectedTripCourierId(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  {couriers.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code} - {c.vehicleType || 'دراجة'}) - تغطية: {c.coverageZones || 'الكل'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  تاريخ الرحلة *
                </label>
                <input
                  type="date"
                  value={tripDate}
                  onChange={e => setTripDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Order Selection Section */}
            <div className="space-y-3 flex-1 overflow-hidden flex flex-col">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-800 text-xs sm:text-sm">
                    الطلبيات الجاهزة للتوصيل ({dispatchableOrders.length})
                  </span>
                  <button
                    type="button"
                    onClick={handleSelectAllFilteredOrders}
                    className="text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
                  >
                    تحديد / إلغاء تحديد الكل ({filteredDispatchableOrders.length})
                  </button>
                </div>

                <div className="relative sm:w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="بحث برقم الطلب، اسم العميل، العنوان..."
                    value={orderSearchTerm}
                    onChange={e => setOrderSearchTerm(e.target.value)}
                    className="w-full pl-3 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Orders List */}
              <div className="border border-slate-200 rounded-2xl overflow-y-auto max-h-56 divide-y divide-slate-100 flex-1">
                {filteredDispatchableOrders.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    لا توجد طلبيات مطابقة للبحث أو بانتظار التوصيل.
                  </div>
                ) : (
                  filteredDispatchableOrders.map(order => {
                    const cust = customers.find(c => c.id === order.customerId);
                    const isSelected = selectedOrderIds.includes(order.id);
                    const remaining = Math.max(0, order.remainingAmount || 0);
                    const delFee = order.deliveryFee || 1500;
                    const totalDue = remaining + delFee;

                    return (
                      <div
                        key={order.id}
                        onClick={() => handleToggleSelectOrder(order.id)}
                        className={`p-3 flex items-center justify-between gap-3 text-xs transition-colors cursor-pointer ${
                          isSelected ? 'bg-blue-50/70 hover:bg-blue-50' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}} // handled by parent div
                            className="w-4 h-4 text-blue-600 rounded-md focus:ring-blue-500 cursor-pointer"
                          />
                          <div>
                            <div className="font-bold text-slate-800 flex items-center gap-2">
                              <span>طلب #{order.orderNumber}</span>
                              <span className="text-slate-400">•</span>
                              <span className="text-blue-700">{order.customerName || cust?.name}</span>
                              <span className="text-slate-500 text-[11px]" dir="ltr">
                                {cust?.phone}
                              </span>
                            </div>
                            <div className="text-slate-500 text-[11px] flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              <span>{cust?.pickupLocation || cust?.governorate || 'صنعاء'}</span>
                            </div>
                          </div>
                        </div>

                        <div className="text-left">
                          <span className="text-slate-400 block text-[10px]">المطلوب تحصيله (COD)</span>
                          <span className="font-extrabold text-amber-700">
                            {totalDue.toLocaleString()} ريال
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Trip Summary Bottom Bar */}
            <div className="bg-slate-900 text-white rounded-2xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <div className="flex items-center gap-6 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px]">الطلبات المحددة</span>
                  <span className="text-lg font-black text-white">{newTripSummary.orderCount} طلبات</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">إجمالي النقدية المتوقعة (COD)</span>
                  <span className="text-lg font-black text-amber-400">
                    {newTripSummary.totalExpectedCash.toLocaleString()} ريال
                  </span>
                </div>
                <div className="hidden md:block">
                  <span className="text-slate-400 block text-[10px]">عمولة الموصل التقديرية</span>
                  <span className="text-sm font-extrabold text-blue-300">
                    {newTripSummary.estimatedCommission.toLocaleString()} ريال
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewTripModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 font-bold text-xs cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleCreateTrip}
                  disabled={selectedOrderIds.length === 0}
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg transition-all disabled:opacity-50 cursor-pointer"
                >
                  إنشاء الرحلة وتوزيع الطلبيات
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: SETTLE DELIVERY TRIP (تصفية ومحاسبة الرحلة)      */}
      {/* ======================================================== */}
      {settlingTrip && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 shadow-2xl space-y-5 max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <ArrowRightLeft className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">
                    تصفية ومحاسبة رحلة التوصيل {settlingTrip.tripNumber}
                  </h3>
                  <p className="text-xs text-slate-400">
                    الموصل: {settlingTrip.courierName} • التاريخ: {settlingTrip.date}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSettlingTrip(null)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Instruction Banner */}
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3 text-xs text-blue-800 flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <p>
                حدد حالة تسليم كل طلبية والمبلغ المحصل فعلياً. عند اعتماد التصفية سيتم:
                <b> 1) تحديث حالة الطلبات لرصيد مسدد </b> •
                <b> 2) إصدار سندات قبض آلية للعملاء </b> •
                <b> 3) إيداع الصافي في الصندوق المختار </b> •
                <b> 4) تسجيل قيد يومية محاسبي بالتحصيلات وأتعاب الموصل </b>.
              </p>
            </div>

            {/* Items Settlement List */}
            <div className="flex-1 overflow-y-auto space-y-3 divide-y divide-slate-100 max-h-64 pr-1">
              {settlementItems.map((item, idx) => {
                const orig = settlingTrip.items.find(ti => ti.orderId === item.orderId);
                const order = orders.find(o => o.id === item.orderId);

                return (
                  <div key={item.orderId} className="pt-3 first:pt-0 space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <div>
                        <div className="font-bold text-slate-800 flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-[10px]">
                            {idx + 1}
                          </span>
                          <span>طلب #{orig?.orderNumber}</span>
                          <span className="text-slate-400">•</span>
                          <span className="text-blue-700 font-bold">{orig?.customerName}</span>
                          <span className="text-slate-400" dir="ltr">{orig?.customerPhone}</span>
                        </div>
                        <div className="text-slate-500 text-[11px] mt-0.5 mr-7">
                          المطلوب أصلاً: {orig?.totalDueFromCustomer.toLocaleString()} ريال (باقي الطلب: {orig?.orderRemainingAmount.toLocaleString()} + توصيل: {orig?.deliveryFee.toLocaleString()})
                        </div>
                      </div>

                      {/* Status Selector */}
                      <div className="flex items-center gap-1.5 mr-7 sm:mr-0">
                        <button
                          type="button"
                          onClick={() => handleItemStatusChange(item.orderId, 'delivered')}
                          className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            item.status === 'delivered'
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          تم التسليم
                        </button>
                        <button
                          type="button"
                          onClick={() => handleItemStatusChange(item.orderId, 'returned')}
                          className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            item.status === 'returned'
                              ? 'bg-rose-600 text-white shadow-xs'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          مرتجع
                        </button>
                        <button
                          type="button"
                          onClick={() => handleItemStatusChange(item.orderId, 'postponed')}
                          className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            item.status === 'postponed'
                              ? 'bg-amber-600 text-white shadow-xs'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          مؤجل
                        </button>
                      </div>
                    </div>

                    {/* Collected Amount & Notes input if delivered */}
                    {item.status === 'delivered' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50 rounded-xl p-2.5 text-xs mr-7">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">
                            المبلغ المحصل فعلياً (ريال)
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={item.collectedAmount}
                            onChange={e => handleItemCollectedAmountChange(item.orderId, Number(e.target.value) || 0)}
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">
                            ملاحظة على التسليم
                          </label>
                          <input
                            type="text"
                            placeholder="سلم باليد، استلمت أخته، كاش..."
                            value={item.notes}
                            onChange={e => handleItemNotesChange(item.orderId, e.target.value)}
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Financial Settlement Configuration */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    إيداع صافي النقدية في حساب / صندوق *
                  </label>
                  <select
                    value={depositAccountId}
                    onChange={e => setDepositAccountId(Number(e.target.value))}
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({acc.type})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    أجور الموصل المستقطعة من التحصيل (ريال)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={courierCommissionPaid}
                    onChange={e => setCourierCommissionPaid(Number(e.target.value) || 0)}
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-800"
                  />
                </div>
              </div>

              {/* Settlement Summary Breakdown */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200 text-xs">
                <div className="flex items-center gap-4">
                  <div>
                    <span className="text-slate-500 block text-[10px]">إجمالي التحصيل:</span>
                    <span className="font-extrabold text-slate-800 text-sm">
                      {computedSettlementTotal.totalCollected.toLocaleString()} ريال
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">أجور الموصل:</span>
                    <span className="font-extrabold text-rose-600 text-sm">
                      - {computedSettlementTotal.comm.toLocaleString()} ريال
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">الصافي للتوريد في الصندوق:</span>
                    <span className="font-black text-emerald-700 text-base">
                      {computedSettlementTotal.netDeposit.toLocaleString()} ريال
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSettlingTrip(null)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold text-xs cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmSettlement}
                    className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                  >
                    اعتماد التصفية وتوريد {computedSettlementTotal.netDeposit.toLocaleString()} ريال
                  </button>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 4: PRINT MANIFEST / RUN-SHEET (كشف تسليم الطلبيات)  */}
      {/* ======================================================== */}
      {printingTrip && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 shadow-2xl space-y-6 max-h-[92vh] flex flex-col print:p-0 print:shadow-none print:max-w-none print:w-full">
            
            {/* Action Bar (hidden in print) */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 print:hidden">
              <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
                <Printer className="w-4 h-4 text-blue-600" />
                <span>معاينة وطباعة كشف رحلة التوصيل #{printingTrip.tripNumber}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>طباعة الآن (A4)</span>
                </button>
                <button
                  onClick={() => setPrintingTrip(null)}
                  className="px-3 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs cursor-pointer"
                >
                  إغلاق
                </button>
              </div>
            </div>

            {/* Printable Manifest Document */}
            <div className="p-6 border border-slate-200 rounded-2xl space-y-6 text-slate-900 print:border-none print:p-0">
              
              {/* Header */}
              <div className="flex items-start justify-between pb-4 border-b-2 border-slate-800">
                <div>
                  <h2 className="text-xl font-black text-slate-900">TOP STORE — متجر توب ستور</h2>
                  <p className="text-xs text-slate-600 mt-1">كشف تسليم وتحصيل طلبيات التوصيل (Manifest Run-Sheet)</p>
                </div>
                <div className="text-left text-xs font-semibold space-y-1">
                  <div>رقم الرحلة: <span className="font-extrabold">{printingTrip.tripNumber}</span></div>
                  <div>التاريخ: {printingTrip.date}</div>
                  <div>الموصل: <span className="font-extrabold">{printingTrip.courierName}</span> ({printingTrip.courierPhone})</div>
                </div>
              </div>

              {/* Table */}
              <table className="w-full text-right text-xs border border-slate-300">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300 font-extrabold text-slate-800">
                    <th className="p-2 border-l border-slate-300 w-8 text-center">#</th>
                    <th className="p-2 border-l border-slate-300">رقم الطلب</th>
                    <th className="p-2 border-l border-slate-300">اسم العميل</th>
                    <th className="p-2 border-l border-slate-300">رقم الهاتف</th>
                    <th className="p-2 border-l border-slate-300">العنوان والتفاصيل</th>
                    <th className="p-2 border-l border-slate-300 text-center">المطلوب تحصيله (COD)</th>
                    <th className="p-2 text-center w-28">توقيع المستلم</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {printingTrip.items.map((item, idx) => (
                    <tr key={idx} className="h-12">
                      <td className="p-2 border-l border-slate-200 text-center font-bold">{idx + 1}</td>
                      <td className="p-2 border-l border-slate-200 font-bold">#{item.orderNumber}</td>
                      <td className="p-2 border-l border-slate-200 font-semibold">{item.customerName}</td>
                      <td className="p-2 border-l border-slate-200" dir="ltr">{item.customerPhone}</td>
                      <td className="p-2 border-l border-slate-200 text-[11px] text-slate-600">
                        {item.customerAddress || 'صنعاء'}
                        {item.notes && <div className="text-amber-700">{item.notes}</div>}
                      </td>
                      <td className="p-2 border-l border-slate-200 text-center font-black text-sm">
                        {item.totalDueFromCustomer.toLocaleString()} ريال
                      </td>
                      <td className="p-2 text-center border-slate-200 text-[10px] text-slate-400">
                        ....................
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50 font-black border-t-2 border-slate-800 text-xs">
                    <td colSpan={5} className="p-2.5 text-left border-l border-slate-300">
                      إجمالي المبالغ المطلوب تحصيلها في عهدة الموصل:
                    </td>
                    <td className="p-2.5 text-center text-sm border-l border-slate-300 text-emerald-800">
                      {printingTrip.totalExpectedCash.toLocaleString()} ريال
                    </td>
                    <td className="p-2.5 text-center text-[10px] text-slate-500">
                      {printingTrip.items.length} طرد
                    </td>
                  </tr>
                </tfoot>
              </table>

              {/* Signatures */}
              <div className="grid grid-cols-2 gap-8 pt-8 text-xs font-bold border-t border-slate-200">
                <div className="space-y-4">
                  <div>توقيع واستلام الموصل: .......................................</div>
                  <div className="text-[11px] text-slate-500 font-normal">
                    أقر باستلام الطرود المبينة أعلاه والالتزام بتوريد المبالغ المحصلة لخزينة المتجر فور انتهاء الرحلة.
                  </div>
                </div>
                <div className="space-y-4 text-left">
                  <div>اعتماد مشرف التوزيع والمتجر: .......................................</div>
                  <div className="text-[11px] text-slate-500 font-normal">
                    نظام توب ستور المحاسبي المتكامل — صنعاء
                  </div>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
};
