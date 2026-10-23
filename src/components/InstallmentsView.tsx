import React, { useState, useMemo, useEffect } from 'react';
import {
  ShoppingBag,
  Receipt,
  Plus,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Wallet,
  Search,
  Filter,
  DollarSign,
  User,
  Printer,
  Calendar,
  Layers,
  ArrowRight,
  ExternalLink,
  MessageCircle,
  Phone,
  Check,
  CreditCard,
  FileText,
  BadgeAlert,
  ChevronDown,
  Sparkles,
  Building2,
  Banknote,
  Bike,
  Edit,
  Trash2,
  Save,
  X,
  RotateCcw
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { Order, Payment, Customer, Account } from '../types';
import { numberToArabicWords } from '../utils/tafqeet';
import { ReceiptModal } from './modals/ReceiptModal';

interface InstallmentsViewProps {
  onEditPayment?: (payment: Payment) => void;
  onOpenReceipt?: (payment: Payment) => void;
}

export const InstallmentsView: React.FC<InstallmentsViewProps> = ({
  onEditPayment,
  onOpenReceipt
}) => {
  const {
    orders,
    payments,
    customers,
    accounts,
    chartAccounts = [],
    couriers = [],
    deliveryOrders = [],
    recordPayment,
    updatePayment,
    deletePayment,
    fixDuplicateOrder9,
    cleanDuplicatePayments,
    getCustomerBalance,
    getAccountBalance,
    addAccount,
    consolidateOrders,
    showNotification
  } = useStore();

  // Selected Customer & Selected Order
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [customerSearchQuery, setCustomerSearchQuery] = useState<string>('');
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);

  // Payment Edit Mode State (وضع تعديل الدفعات)
  const [isEditPaymentsMode, setIsEditPaymentsMode] = useState<boolean>(true);
  const [editingPaymentItem, setEditingPaymentItem] = useState<Payment | null>(null);
  const [editPaymentAmount, setEditPaymentAmount] = useState<string>('');
  const [editPaymentAccountId, setEditPaymentAccountId] = useState<number>(1);
  const [editPaymentDate, setEditPaymentDate] = useState<string>('');
  const [editPaymentType, setEditPaymentType] = useState<string>('سداد دفعة');
  const [editReceiptNumber, setEditReceiptNumber] = useState<string>('');
  const [editPaymentNotes, setEditPaymentNotes] = useState<string>('');
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);

  // Consolidation / Merge duplicate orders state
  const [isMergeOrdersModalOpen, setIsMergeOrdersModalOpen] = useState<boolean>(false);
  const [mergeTargetOrderId, setMergeTargetOrderId] = useState<number | null>(null);

  // Search & Filter for Orders list
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'unpaid' | 'partially_paid' | 'paid'>('all');

  // Form State: "الدفعة التي اريد ادفعها الان"
  const [paymentAmount, setPaymentAmount] = useState<string>('');

  // تجميع كافة الحسابات والمحافظ المالية (من جدول الحسابات + أي حساب مالي مضاف في شجرة الحسابات)
  const availableAccounts = useMemo(() => {
    const list = accounts.filter(a => a.status !== 'inactive' && a.type !== 'حقوق ملكية');
    const existingNames = new Set(list.map(a => a.name.trim().toLowerCase()));
    const extraFromChart: Account[] = [];

    (chartAccounts || []).forEach(ca => {
      if (
        ca.category === 'asset' ||
        ca.subCategory?.includes('بنوك') ||
        ca.subCategory?.includes('محافظ') ||
        ca.subCategory?.includes('نقدية') ||
        ca.name?.includes('محفظة') ||
        ca.name?.includes('بنك') ||
        ca.name?.includes('كاش') ||
        ca.name?.includes('صندوق') ||
        ca.name?.includes('كريمي') ||
        ca.name?.includes('جيب') ||
        ca.name?.includes('ون كاش') ||
        ca.name?.includes('مبايل') ||
        ca.name?.includes('فلوس')
      ) {
        if (!existingNames.has(ca.name.trim().toLowerCase())) {
          existingNames.add(ca.name.trim().toLowerCase());
          extraFromChart.push({
            id: ca.id,
            name: ca.name,
            type: ca.name.includes('محفظة')
              ? 'محفظة'
              : (ca.name.includes('بنك') ? 'بنكي' : (ca.name.includes('بطاقة') ? 'بطاقة' : 'نقدي')),
            openingBalance: 0,
            status: 'active',
            createdAt: ca.createdAt || new Date().toISOString()
          });
        }
      }
    });

    return [...list, ...extraFromChart];
  }, [accounts, chartAccounts]);

  const [selectedAccountId, setSelectedAccountId] = useState<number>(() => {
    const defaultAcc = accounts.find(a => a.name.includes('جيب') || a.name.includes('كريمي')) || accounts[0];
    return defaultAcc ? defaultAcc.id : 1;
  });

  // التأكد من اختيار محفظة صالحة دائماً
  useEffect(() => {
    if (availableAccounts.length > 0 && !availableAccounts.some(a => a.id === selectedAccountId)) {
      const preferred = availableAccounts.find(a => a.name.includes('جيب') || a.name.includes('كريمي') || a.type === 'محفظة') || availableAccounts[0];
      if (preferred) setSelectedAccountId(preferred.id);
    }
  }, [availableAccounts, selectedAccountId]);

  // طريقة وقناة الاستلام: محفظة/بنك (افتراضي)، نقداً بالصندوق، نقدي للمندوب
  const [paymentChannel, setPaymentChannel] = useState<'wallet' | 'cash' | 'courier'>('wallet');
  const [hasCourierDelivery, setHasCourierDelivery] = useState<boolean>(false);

  // إضافة محفظة أو حساب جديد سريعاً مباشرة داخل شاشة الدفعات
  const [showQuickAddWallet, setShowQuickAddWallet] = useState(false);
  const [newWalletName, setNewWalletName] = useState('');
  const [newWalletType, setNewWalletType] = useState<Account['type']>('محفظة');
  const [newWalletBalance, setNewWalletBalance] = useState<number>(0);
  const [quickAddError, setQuickAddError] = useState('');

  const handleQuickAddWallet = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!newWalletName.trim()) {
      setQuickAddError('يرجى كتابة اسم المحفظة أو الحساب');
      return;
    }
    setQuickAddError('');
    const created = addAccount({
      name: newWalletName.trim(),
      type: newWalletType,
      openingBalance: Number(newWalletBalance) || 0,
      openingBalanceDate: new Date().toISOString(),
      status: 'active',
      notes: 'تمت إضافتها من شاشة الدفعات'
    });
    if (created?.id) {
      setSelectedAccountId(created.id);
      setPaymentChannel(newWalletType === 'نقدي' ? 'cash' : 'wallet');
    }
    setShowQuickAddWallet(false);
    setNewWalletName('');
    setNewWalletBalance(0);
  };

  const [paymentType, setPaymentType] = useState<string>('عربون / دفعة أولى');
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [statement, setStatement] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [formError, setFormError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Courier & Delivery System State
  const [courierId, setCourierId] = useState<number>(() => couriers[0]?.id || 0);
  const [deliveryPaymentMethod, setDeliveryPaymentMethod] = useState<'cash_to_courier' | 'transfer_to_wallet'>('transfer_to_wallet');
  const [deliveryFee, setDeliveryFee] = useState<number>(1500);
  const [courierCustodyAmount, setCourierCustodyAmount] = useState<number>(0);
  const [customCustodyEdited, setCustomCustodyEdited] = useState<boolean>(false);

  // Receipt Modal State
  const [receiptToPrint, setReceiptToPrint] = useState<Payment | null>(null);

  // Orders with remaining amount priority list
  const activeOrders = useMemo(() => {
    return orders.filter(o => o.status !== 'cancelled');
  }, [orders]);

  // Helper to get all orders for a specific customer (matches by customerId or exact customerName)
  const getOrdersForCustomer = (custId: number | null) => {
    if (!custId) return [];
    const custObj = customers.find(c => c.id === custId);
    return activeOrders.filter(o =>
      o.customerId === custId ||
      (custObj?.name && o.customerName && o.customerName.trim() === custObj.name.trim())
    );
  };

  // Set default selected customer and order if none is selected
  useEffect(() => {
    if (!selectedOrderId && activeOrders.length > 0) {
      // Prioritize order with remaining debt
      const withDebt = activeOrders.find(o => (o.remainingAmount || 0) > 0);
      const initialOrder = withDebt || activeOrders[0];
      setSelectedOrderId(initialOrder.id);
      if (initialOrder.customerId) {
        setSelectedCustomerId(initialOrder.customerId);
      } else {
        const matchedCust = customers.find(c => c.name?.trim() === initialOrder.customerName?.trim());
        if (matchedCust) setSelectedCustomerId(matchedCust.id);
      }
    }
  }, [activeOrders, selectedOrderId, customers]);

  // Handler when user selects a customer
  const handleSelectCustomer = (custId: number) => {
    setSelectedCustomerId(custId);
    const custOrders = getOrdersForCustomer(custId);
    if (custOrders.length > 0) {
      // Prioritize an order with remaining balance, otherwise pick the latest/first order
      const unpaidOrd = custOrders.find(o => (o.remainingAmount || 0) > 0);
      setSelectedOrderId(unpaidOrd ? unpaidOrd.id : custOrders[0].id);
    } else {
      setSelectedOrderId(null);
    }
  };

  // Handler when user selects an order directly
  const handleSelectOrder = (order: Order) => {
    setSelectedOrderId(order.id);
    if (order.customerId) {
      setSelectedCustomerId(order.customerId);
    } else {
      const matchedCust = customers.find(c => c.name?.trim() === order.customerName?.trim());
      if (matchedCust) setSelectedCustomerId(matchedCust.id);
    }
  };

  // Current Selected Order Object
  const selectedOrder = useMemo(() => {
    if (!selectedOrderId) return null;
    return orders.find(o => o.id === selectedOrderId) || null;
  }, [orders, selectedOrderId]);

  // Customer for Selected Customer ID or Selected Order
  const selectedCustomer = useMemo(() => {
    if (selectedCustomerId) {
      return customers.find(c => c.id === selectedCustomerId) || null;
    }
    if (!selectedOrder) return null;
    return customers.find(c => c.id === selectedOrder.customerId) || null;
  }, [customers, selectedCustomerId, selectedOrder]);

  // All orders belonging to the currently selected customer
  const selectedCustomerOrders = useMemo(() => {
    if (!selectedCustomer) {
      if (selectedOrder?.customerName) {
        return activeOrders.filter(o => o.customerName?.trim() === selectedOrder.customerName?.trim());
      }
      return [];
    }
    return activeOrders.filter(o =>
      o.customerId === selectedCustomer.id ||
      (selectedCustomer.name && o.customerName && o.customerName.trim() === selectedCustomer.name.trim())
    );
  }, [activeOrders, selectedCustomer, selectedOrder]);

  // Filtered customers for the customer selector search
  const customersWithOrderStats = useMemo(() => {
    return customers.map(c => {
      const cOrders = activeOrders.filter(
        o => o.customerId === c.id || (c.name && o.customerName && o.customerName.trim() === c.name.trim())
      );
      const totalRem = cOrders.reduce((sum, o) => sum + (Number(o.remainingAmount) || 0), 0);
      const totalVal = cOrders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);
      return {
        customer: c,
        ordersCount: cOrders.length,
        totalRemaining: totalRem,
        totalValue: totalVal
      };
    }).filter(item => {
      if (!customerSearchQuery.trim()) return true;
      const q = customerSearchQuery.toLowerCase().trim();
      return (
        (item.customer.name || '').toLowerCase().includes(q) ||
        (item.customer.phone || '').includes(q) ||
        (item.customer.code || '').toLowerCase().includes(q) ||
        (item.customer.governorate || '').toLowerCase().includes(q)
      );
    }).sort((a, b) => b.ordersCount - a.ordersCount || b.totalRemaining - a.totalRemaining);
  }, [customers, activeOrders, customerSearchQuery]);

  // Previous payments specifically for this order
  const previousPayments = useMemo(() => {
    if (!selectedOrder) return [];
    return payments
      .filter(p => p.orderId === selectedOrder.id && p.status !== 'cancelled')
      .sort((a, b) => new Date(b.createdAt || b.paymentDate).getTime() - new Date(a.createdAt || a.paymentDate).getTime());
  }, [payments, selectedOrder]);

  // Update default payment amount and statement when selected order changes
  useEffect(() => {
    if (selectedOrder) {
      const remaining = selectedOrder.remainingAmount || 0;
      setPaymentAmount(remaining > 0 ? String(remaining) : '0');
      
      const pType = (selectedOrder.paidAmount || 0) === 0
        ? 'عربون / دفعة أولى'
        : (remaining <= 0 ? 'دفعة تسوية' : 'دفعة نهائية');
      setPaymentType(pType);
      setStatement(`سداد ${pType} للطلب #${selectedOrder.orderNumber} (${selectedOrder.site || 'شي إن'})`);
      setFormError('');

      const existingDlv = deliveryOrders.find(
        d => d.orderId === selectedOrder.id || String(d.orderNumber) === String(selectedOrder.orderNumber)
      );
      const initCourierId = selectedOrder.courierId || existingDlv?.courierId || couriers[0]?.id || 0;
      setCourierId(initCourierId);
      const cObj = couriers.find(c => c.id === initCourierId);
      setDeliveryFee(Number(selectedOrder.deliveryFee) || Number(existingDlv?.deliveryFee) || Number(cObj?.defaultDeliveryFee) || 1500);
      setCourierCustodyAmount(remaining);
      setCustomCustodyEdited(false);
    }
  }, [selectedOrderId, selectedOrder?.remainingAmount, selectedOrder?.paidAmount]);

  // Overall Financial Statistics
  const overallStats = useMemo(() => {
    const totalOrderValues = activeOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const totalCollected = activeOrders.reduce((sum, o) => sum + (o.paidAmount || 0), 0);
    const totalRemaining = activeOrders.reduce((sum, o) => sum + (o.remainingAmount || 0), 0);
    const collectionRate = totalOrderValues > 0 ? Math.round((totalCollected / totalOrderValues) * 100) : 0;

    return {
      totalOrderValues,
      totalCollected,
      totalRemaining,
      collectionRate,
      unpaidCount: activeOrders.filter(o => (o.remainingAmount || 0) > 0).length,
      fullyPaidCount: activeOrders.filter(o => (o.remainingAmount || 0) === 0).length
    };
  }, [activeOrders]);

  // Filtered Orders for the Selection Table
  const filteredOrders = useMemo(() => {
    return activeOrders.filter(o => {
      const remaining = o.remainingAmount || 0;
      const paid = o.paidAmount || 0;

      // Status filter
      if (filterStatus === 'unpaid' && remaining <= 0) return false;
      if (filterStatus === 'paid' && remaining > 0) return false;
      if (filterStatus === 'partially_paid' && (paid === 0 || remaining <= 0)) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const numMatch = String(o.orderNumber || '').toLowerCase().includes(q);
        const nameMatch = (o.customerName || '').toLowerCase().includes(q);
        const phoneMatch = (o.customerPhone || '').includes(q);
        const itemsMatch = (o.itemsDescription || '').toLowerCase().includes(q);
        const siteMatch = (o.site || '').toLowerCase().includes(q);
        return numMatch || nameMatch || phoneMatch || itemsMatch || siteMatch;
      }

      return true;
    });
  }, [activeOrders, filterStatus, searchQuery]);

  // Numeric calculations for form
  const numPayNow = Number(paymentAmount) || 0;
  const currentRem = selectedOrder ? (selectedOrder.remainingAmount || 0) : 0;
  const remainingAfterPayment = Math.max(0, currentRem - numPayNow);
  const amountWords = numPayNow > 0 ? numberToArabicWords(numPayNow) : '';

  const isFinalPaymentFlow = Boolean(
    paymentType === 'دفعة نهائية' ||
    paymentType === 'دفعة استلام نهائية' ||
    (selectedOrder && numPayNow > 0 && remainingAfterPayment === 0)
  );
  const selectedCourier = couriers.find(c => c.id === courierId);
  const selectedAcc = availableAccounts.find(a => a.id === selectedAccountId) || accounts.find(a => a.id === selectedAccountId);

  useEffect(() => {
    if (!customCustodyEdited) {
      setCourierCustodyAmount(numPayNow);
    }
  }, [numPayNow, customCustodyEdited]);

  // Handle Recording the Payment Now
  const handleRecordPaymentNow = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!selectedOrder) {
      setFormError('يرجى اختيار الطلب أولاً');
      return;
    }

    if (numPayNow <= 0) {
      setFormError('يرجى إدخال مبلغ دفع صحيح أكبر من صفر');
      return;
    }

    if (paymentChannel === 'wallet' && !selectedAccountId) {
      setFormError('يرجى تحديد المحفظة أو الحساب البنكي المستلم');
      return;
    }

    if (paymentChannel === 'courier' && !courierId && couriers.length > 0) {
      setFormError('يرجى اختيار المندوب المستلم ليتم تسجيل العهدة في حسابه');
      return;
    }

    setFormError('');
    setIsSubmitting(true);

    try {
      let chosenAccountId = selectedAccountId;
      let effectivePaymentMethod = selectedAcc?.name || 'محفظة';

      if (paymentChannel === 'cash') {
        const cashAcc = availableAccounts.find(a => a.type === 'نقدي' || a.name.includes('الصندوق')) || availableAccounts[0];
        if (cashAcc) {
          chosenAccountId = cashAcc.id;
          effectivePaymentMethod = cashAcc.name;
        } else {
          effectivePaymentMethod = 'نقداً بالصندوق';
        }
      } else if (paymentChannel === 'courier') {
        effectivePaymentMethod = `نقدي للمندوب (${selectedCourier?.name || 'المندوب'})`;
      }

      const isCourierFlow = paymentChannel === 'courier' || hasCourierDelivery;
      const dlvMethod = paymentChannel === 'courier' ? 'cash_to_courier' : 'transfer_to_wallet';

      const created = recordPayment({
        customerId: selectedOrder.customerId,
        orderId: selectedOrder.id,
        amount: numPayNow,
        accountId: chosenAccountId,
        paymentMethod: effectivePaymentMethod,
        paymentType: isFinalPaymentFlow ? 'دفعة نهائية' : paymentType,
        statement: statement.trim() || `سداد ${isFinalPaymentFlow ? 'دفعة نهائية' : paymentType} للطلب #${selectedOrder.orderNumber}`,
        notes: notes.trim() || undefined,
        courierId: isCourierFlow && courierId ? courierId : undefined,
        deliveryPaymentMethod: isCourierFlow && courierId ? dlvMethod : undefined,
        deliveryFee: isCourierFlow && courierId ? Number(deliveryFee) : undefined,
        courierCustodyAmount: paymentChannel === 'courier' && courierId ? Number(courierCustodyAmount) : undefined
      });

      setIsSubmitting(false);

      // Offer to view and print official receipt
      if (created) {
        setReceiptToPrint(created);
      }
    } catch (err: any) {
      setIsSubmitting(false);
      setFormError(err?.message || 'حدث خطأ أثناء حفظ الدفعة');
    }
  };

  // Handler: Start editing payment
  const handleOpenEditPayment = (pmt: Payment) => {
    if (onEditPayment) {
      onEditPayment(pmt);
      return;
    }
    setEditingPaymentItem(pmt);
    setEditPaymentAmount(String(pmt.amount));
    setEditPaymentAccountId(pmt.accountId || 1);
    setEditPaymentDate(pmt.paymentDate ? pmt.paymentDate.split('T')[0] : (pmt.createdAt?.split('T')[0] || new Date().toISOString().split('T')[0]));
    setEditPaymentType(pmt.paymentType || 'سداد دفعة');
    setEditReceiptNumber(pmt.receiptNumber || pmt.paymentNumber || '');
    setEditPaymentNotes(pmt.notes || pmt.statement || '');
  };

  // Handler: Save payment edit
  const handleSavePaymentEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPaymentItem) return;
    const numAmt = parseFloat(editPaymentAmount);
    if (!numAmt || numAmt <= 0) {
      showNotification('يرجى إدخال مبلغ صحيح للدفعة', 'error');
      return;
    }
    setIsSavingEdit(true);
    try {
      updatePayment(editingPaymentItem.id, {
        amount: numAmt,
        accountId: editPaymentAccountId,
        paymentDate: editPaymentDate,
        paymentType: editPaymentType,
        receiptNumber: editReceiptNumber,
        notes: editPaymentNotes
      });
      setEditingPaymentItem(null);
    } catch (err: any) {
      showNotification(err?.message || 'حدث خطأ أثناء حفظ تعديل الدفعة', 'error');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Handler: Delete duplicate payment
  const handleDeleteDuplicatePayment = (pmt: Payment) => {
    if (window.confirm(`هل أنت متأكد من حذف هذه الدفعة المكررة (#${pmt.receiptNumber || pmt.paymentNumber}) بمبلغ ${Number(pmt.amount).toLocaleString()} ر.ي واستعادة رصيد الطلب؟`)) {
      deletePayment(pmt.id, { permanent: true });
    }
  };

  // Check if current customer or order is "اسماء ابراهيم عبد القوي" or order 9
  const isAsmaaCustomerOrOrder9 = useMemo(() => {
    return Boolean(
      selectedCustomer?.name?.includes('اسماء') ||
      selectedCustomer?.id === 540003 ||
      selectedOrder?.customerName?.includes('اسماء') ||
      selectedOrder?.customerId === 540003 ||
      String(selectedOrder?.orderNumber) === '9' ||
      selectedOrder?.id === 990005
    );
  }, [selectedCustomer, selectedOrder]);

  // Asmaa Order 9 details and duplicate checking
  const asmaaOrder9Info = useMemo(() => {
    const custOrders = orders.filter(
      o => o.customerId === 540003 || (o.customerName && o.customerName.includes('اسماء'))
    );
    const order9List = custOrders.filter(
      o => String(o.orderNumber) === '9' || o.id === 990005 || o.internalNumber === '9'
    );
    const order9Payments = payments.filter(
      p => (p.orderId === 990005 || order9List.some(o => o.id === p.orderId)) && p.status !== 'cancelled'
    );
    const totalPaymentsAmount = order9Payments.reduce((s, p) => s + Number(p.amount || 0), 0);
    const hasDuplicateOrder = order9List.length > 1;
    const hasDuplicatePayments = new Set(order9Payments.map(p => `${p.amount}_${p.receiptNumber || p.id}`)).size !== order9Payments.length;

    return {
      order9List,
      order9Payments,
      totalPaymentsAmount,
      hasDuplicateOrder,
      hasDuplicatePayments,
      isResolved: !hasDuplicateOrder && !hasDuplicatePayments && order9List[0]?.totalAmount === 46800
    };
  }, [orders, payments]);

  // Handler: Fix Asmaa Order 9
  const handleFixAsmaaOrder9 = () => {
    fixDuplicateOrder9();
    const asmaaCust = customers.find(c => c.id === 540003 || c.name?.includes('اسماء'));
    if (asmaaCust) {
      setSelectedCustomerId(asmaaCust.id);
      setSelectedOrderId(990005);
    }
  };

  return (
    <div className="space-y-6">

      {/* Top Banner */}
      <div className="bg-gradient-to-l from-slate-900 via-slate-800 to-amber-950 rounded-2xl text-white p-6 shadow-md relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-xs font-bold text-amber-300 mb-2">
              <Receipt className="w-3.5 h-3.5" />
              <span>نظام دفعات الطلبات والتحصيل</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black">إدارة دفعات الطلبات وسندات القبض</h1>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl">
              اختر أي طلبية للاطلاع على بياناتها وتاريخ دفعاتها السابقة وسداد الدفعة الحالية فوراً مع إصدار سند القبض الرسمي.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="bg-white/10 border border-white/15 px-4 py-2 rounded-xl text-left">
              <span className="text-[11px] text-amber-200 block font-medium">نسبة التحصيل الكلية</span>
              <span className="text-xl font-black font-mono text-white">{overallStats.collectionRate}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-bold block mb-1">إجمالي قيمة الطلبيات</span>
          <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
            {overallStats.totalOrderValues.toLocaleString()} <span className="text-xs font-normal text-slate-500">YER</span>
          </div>
          <span className="text-[11px] text-slate-400">{activeOrders.length} طلبيات نشطة</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-bold block mb-1">المبالغ المحصلة (المدفوعة)</span>
          <div className="text-xl sm:text-2xl font-black text-emerald-700 font-mono">
            {overallStats.totalCollected.toLocaleString()} <span className="text-xs font-normal text-slate-500">YER</span>
          </div>
          <span className="text-[11px] text-emerald-600 font-bold">{overallStats.fullyPaidCount} طلب مسدد بالكامل</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-bold block mb-1">المتبقي المطلوب تحصيله</span>
          <div className="text-xl sm:text-2xl font-black text-rose-700 font-mono">
            {overallStats.totalRemaining.toLocaleString()} <span className="text-xs font-normal text-slate-500">YER</span>
          </div>
          <span className="text-[11px] text-rose-600 font-bold">{overallStats.unpaidCount} طلب فيه مبالغ معلقة</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-bold block mb-1">الطلب المختار حالياً</span>
          <div className="text-base sm:text-lg font-black text-indigo-700 font-mono truncate">
            {selectedOrder ? `#${selectedOrder.orderNumber}` : 'لم يُحدد'}
          </div>
          <span className="text-[11px] text-slate-500 truncate block">
            {selectedOrder?.customerName || 'اختر طلباً من القائمة أدناه'}
          </span>
        </div>
      </div>

      {/* Asmaa Abdelkawi Order 9 Reconciliation & Fix Banner */}
      {(isAsmaaCustomerOrOrder9 || !asmaaOrder9Info.isResolved) && (
        <div className="bg-gradient-to-r from-amber-500/15 via-blue-500/10 to-emerald-500/15 border-2 border-amber-400 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shrink-0 shadow-xs">
                <Sparkles className="w-6 h-6 animate-pulse" />
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black text-xs">
                    عميل: اسماء ابراهيم عبد القوي
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-900 text-white font-mono font-bold text-xs">
                    طلب رقم #9
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                    المبلغ الأصلي: 46,800 ر.ي
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-bold">
                    الدفعات المعتمدة: 22,000 ر.ي
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-xs font-bold">
                    المتبقي: 24,800 ر.ي
                  </span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">
                  <strong>تفاصيل الطلب الأصلية:</strong> قيمة السلة 49,800 ر.ي - خصم 3,000 ر.ي = الصافي 46,800 ر.ي | الدفعات المعتمدة: 22,000 ر.ي (دفعة أولى 21,000 ر.ي + دفعة لاحقة 1,000 ر.ي) | المتبقي الدقيق: 24,800 ر.ي.
                </p>
                {asmaaOrder9Info.hasDuplicateOrder && (
                  <p className="text-xs text-rose-700 font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    تم رصد تكرار لسجل الطلب رقم 9 في النظام. انقر على الزر لتصحيحه فوراً واعتماد المبلغ الأصلي والدفعات.
                  </p>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={handleFixAsmaaOrder9}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-black text-xs shadow-md transition cursor-pointer shrink-0 hover:scale-[1.02] active:scale-[0.98]"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-200" />
              <span>⚡ اعتماد المبلغ الأصلي والدفعات وتصحيح التكرار</span>
            </button>
          </div>
        </div>
      )}

      {/* Step 1 & Step 2: Select Customer -> View All Customer Orders -> Pick Order */}
      <div className="bg-white rounded-2xl border-2 border-[#1A3668]/20 shadow-sm overflow-hidden">
        {/* Step 1: Customer Selection Bar */}
        <div className="p-4 sm:p-5 bg-gradient-to-l from-[#1A3668]/5 via-slate-50 to-amber-50/40 border-b border-slate-200 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-[#1A3668] text-[#C5A059] flex items-center justify-center font-black shadow-sm shrink-0">
                <User className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-[#1A3668] text-white text-[10px] font-black">الخطوة 1</span>
                  <h3 className="text-sm sm:text-base font-black text-slate-900">اختر العميل لعرض جميع طلباته</h3>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  عند اختيار العميل ستظهر لك جميع طلباته فوراً، وعند اختيار أي طلب ستظهر كامل بياناته وسجل دفعاته
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full lg:w-auto">
              {/* Quick Search Customer */}
              <div className="relative sm:w-56">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={customerSearchQuery}
                  onChange={e => setCustomerSearchQuery(e.target.value)}
                  placeholder="ابحث باسم أو رقم العميل..."
                  className="w-full pr-9 pl-3 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-bold focus:outline-none focus:border-[#1A3668]"
                />
              </div>

              {/* Customer Dropdown Selector */}
              <div className="sm:w-80">
                <select
                  value={selectedCustomer?.id || ''}
                  onChange={e => {
                    const val = Number(e.target.value);
                    if (val) handleSelectCustomer(val);
                  }}
                  className="w-full p-2.5 rounded-xl border-2 border-[#1A3668] bg-white text-xs font-black text-slate-900 focus:outline-none cursor-pointer shadow-2xs"
                >
                  <option value="" disabled>-- اختر العميل من القائمة --</option>
                  {customersWithOrderStats.map(({ customer: c, ordersCount, totalRemaining }) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.governorate || 'صنعاء'}) — {ordersCount} طلبات {totalRemaining > 0 ? `• المتبقي: ${totalRemaining.toLocaleString()} ر.ي` : '• مسدد'}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Quick Horizontal Customer Pills (Customers with orders) */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 no-scrollbar">
            <span className="text-[11px] font-bold text-slate-500 shrink-0">اختيار سريع للعميل:</span>
            {customersWithOrderStats.filter(x => x.ordersCount > 0).slice(0, 12).map(({ customer: c, ordersCount, totalRemaining }) => {
              const isCustSelected = selectedCustomer?.id === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleSelectCustomer(c.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 cursor-pointer border ${
                    isCustSelected
                      ? 'bg-[#1A3668] text-white border-[#1A3668] shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-[#1A3668]/40 hover:bg-slate-50'
                  }`}
                >
                  <span>{c.name}</span>
                  <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono font-black ${
                    isCustSelected ? 'bg-[#C5A059] text-slate-950' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {ordersCount} طلب
                  </span>
                  {totalRemaining > 0 && (
                    <span className={`text-[10px] font-mono ${isCustSelected ? 'text-amber-200' : 'text-rose-600'}`}>
                      ({totalRemaining.toLocaleString()})
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2: All Orders of the Selected Customer */}
        <div className="p-4 sm:p-5 bg-white space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span className="px-2 py-0.5 rounded-md bg-amber-500 text-slate-950 text-[10px] font-black">الخطوة 2</span>
              <h4 className="text-sm font-black text-slate-900">
                جميع طلبات العميل: <span className="text-[#1A3668] underline decoration-[#C5A059]">{selectedCustomer?.name || selectedOrder?.customerName || 'غير محدد'}</span>
                <span className="mr-2 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-mono">
                  {selectedCustomerOrders.length} طلبات
                </span>
              </h4>
            </div>

            {selectedCustomerOrders.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
                <span className="text-slate-500">
                  إجمالي طلبات العميل: <strong className="font-mono text-slate-900">{selectedCustomerOrders.reduce((s, o) => s + (o.totalAmount || 0), 0).toLocaleString()} ر.ي</strong>
                </span>
                <span className="text-emerald-700">
                  المدفوع: <strong className="font-mono">{selectedCustomerOrders.reduce((s, o) => s + (o.paidAmount || 0), 0).toLocaleString()} ر.ي</strong>
                </span>
                <span className="text-rose-700">
                  المتبقي: <strong className="font-mono font-black">{selectedCustomerOrders.reduce((s, o) => s + (o.remainingAmount || 0), 0).toLocaleString()} ر.ي</strong>
                </span>

                {selectedCustomerOrders.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      setMergeTargetOrderId(selectedCustomerOrders[0]?.id || null);
                      setIsMergeOrdersModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black shadow-xs transition cursor-pointer text-xs"
                    title="دمج طلبات العميل المكررة وتجميع كافة الدفعات في طلب واحد معتمد"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>دمج وتوحيد الطلبات (اعتماد الدفعات)</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {selectedCustomerOrders.length === 0 ? (
            <div className="p-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300 text-xs text-slate-500">
              لا توجد طلبات مسجلة لهذا العميل حالياً. اختر عميلاً آخر من الأعلى لعرض طلباته.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {selectedCustomerOrders.map(ord => {
                const isSelected = selectedOrder?.id === ord.id;
                const rem = ord.remainingAmount || 0;
                const paid = ord.paidAmount || 0;
                const total = ord.totalAmount || 0;
                const orderStatusLabel =
                  ord.status === 'delivered' ? 'تم التسليم للعميل' :
                  ord.status === 'shipped' ? 'في الشحن' :
                  ord.status === 'purchased' ? 'تم الشراء' : 'قيد الانتظار';

                return (
                  <div
                    key={ord.id}
                    onClick={() => handleSelectOrder(ord)}
                    className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between gap-2.5 ${
                      isSelected
                        ? 'border-[#1A3668] bg-gradient-to-br from-[#1A3668]/5 via-blue-50/40 to-amber-50/40 shadow-md ring-2 ring-[#C5A059]/40'
                        : 'border-slate-200 bg-slate-50/60 hover:bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-black text-sm text-slate-950">
                            طلب #{ord.orderNumber}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[10px] font-bold text-indigo-700">
                            {ord.site || 'شي إن'}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                          <span>تاريخ: <strong className="font-mono">{ord.orderDate ? ord.orderDate.split('T')[0] : '—'}</strong></span>
                          <span>•</span>
                          <span>{ord.itemsCount || 1} قطع</span>
                          <span>•</span>
                          <span className="text-slate-700 font-semibold">{orderStatusLabel}</span>
                        </div>
                      </div>

                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black shrink-0 ${
                        rem === 0
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : paid > 0
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : 'bg-rose-100 text-rose-800 border border-rose-300'
                      }`}>
                        {rem === 0 ? 'مسدد بالكامل ✓' : paid > 0 ? 'مسدد جزئياً' : 'غير مسدد'}
                      </span>
                    </div>

                    {ord.notes && (
                      <p className="text-[11px] text-slate-600 line-clamp-1 bg-white/80 px-2 py-1 rounded-lg border border-slate-200/70">
                        {ord.notes}
                      </p>
                    )}

                    <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-slate-200/80 text-center text-[11px]">
                      <div className="bg-white p-1.5 rounded-lg border border-slate-200/80">
                        <span className="text-[10px] text-slate-400 block">الإجمالي</span>
                        <span className="font-mono font-black text-slate-900">{total.toLocaleString()}</span>
                      </div>
                      <div className="bg-emerald-50/70 p-1.5 rounded-lg border border-emerald-200/70">
                        <span className="text-[10px] text-emerald-700 block">المدفوع</span>
                        <span className="font-mono font-black text-emerald-700">{paid.toLocaleString()}</span>
                      </div>
                      <div className="bg-rose-50/70 p-1.5 rounded-lg border border-rose-200/70">
                        <span className="text-[10px] text-rose-700 block">المتبقي</span>
                        <span className="font-mono font-black text-rose-700">{rem.toLocaleString()}</span>
                      </div>
                    </div>

                    <div className={`w-full py-1.5 px-3 rounded-xl text-center text-[11px] font-black transition ${
                      isSelected
                        ? 'bg-[#1A3668] text-white'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-amber-50 hover:text-amber-900'
                    }`}>
                      {isSelected ? '✓ الطلب المحدد حالياً (بياناته معروضة أدناه)' : 'اضغط لعرض بيانات الطلب وسداد دفعة'}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Main Order Payment Workspace: 3 Panels */}
      {selectedOrder ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          
          {/* Panel 1 & 2: Order Data + Previous Payments History (7 Cols) */}
          <div className="lg:col-span-7 space-y-5">
            
            {/* Panel 1: بيانات الطلب المختار */}
            <div className="bg-white rounded-2xl border-2 border-[#1A3668]/20 shadow-xs p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-[#1A3668] text-[#C5A059] flex items-center justify-center font-bold shrink-0 shadow-xs">
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-black">الخطوة 3</span>
                      <h3 className="text-base sm:text-lg font-black text-slate-900">
                        بيانات الطلب المختار #{selectedOrder.orderNumber}
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 font-sans">
                        {selectedOrder.site || 'شي إن SHEIN'}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                      <span>تاريخ الطلب: <strong className="font-mono text-slate-800">{selectedOrder.orderDate ? selectedOrder.orderDate.split('T')[0] : '—'}</strong></span>
                      {selectedOrder.shipmentNumber && (
                        <span>• رقم الشحنة: <strong className="font-mono text-indigo-700">{selectedOrder.shipmentNumber}</strong></span>
                      )}
                      {selectedOrder.invoiceNumber && (
                        <span>• رقم الفاتورة: <strong className="font-mono text-slate-800">{selectedOrder.invoiceNumber}</strong></span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-black ${
                    (selectedOrder.remainingAmount || 0) === 0
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : (selectedOrder.paidAmount || 0) > 0
                      ? 'bg-amber-100 text-amber-900 border border-amber-300'
                      : 'bg-rose-100 text-rose-800 border border-rose-300'
                  }`}>
                    {(selectedOrder.remainingAmount || 0) === 0
                      ? 'مسدد بالكامل ✓'
                      : (selectedOrder.paidAmount || 0) > 0
                      ? 'مسدد جزئياً'
                      : 'بانتظار العربون'}
                  </span>
                </div>
              </div>

              {/* Customer Info Box */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-[#1A3668] font-bold shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block">العميل صاحب الطلب:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-slate-900 text-sm">{selectedCustomer?.name || selectedOrder.customerName}</span>
                      {(selectedCustomer?.governorate || selectedCustomer?.address) && (
                        <span className="px-2 py-0.5 rounded bg-white border border-slate-200 text-[10px] font-bold text-slate-600">
                          {selectedCustomer?.governorate} {selectedCustomer?.address ? `- ${selectedCustomer.address}` : ''}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {(selectedCustomer?.phone || (selectedOrder as any).customerPhone) && (
                  <div className="flex items-center gap-2">
                    <a
                      href={`tel:${selectedCustomer?.phone || (selectedOrder as any).customerPhone}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:text-slate-900 font-mono text-xs font-medium"
                    >
                      <Phone className="w-3 h-3 text-slate-500" />
                      <span>{selectedCustomer?.phone || (selectedOrder as any).customerPhone}</span>
                    </a>
                    <a
                      href={`https://wa.me/967${String(selectedCustomer?.phone || (selectedOrder as any).customerPhone).replace(/^0+/, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 font-bold text-xs"
                      title="مراسلة عبر واتساب"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                      <span>واتساب</span>
                    </a>
                  </div>
                )}
              </div>

              {/* Detailed Order Specifications Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                <div className="p-2.5 bg-slate-50/80 rounded-xl border border-slate-200/80">
                  <span className="text-[10px] text-slate-400 block">عدد القطع / الأصناف</span>
                  <span className="font-black text-slate-900 font-mono text-sm">{selectedOrder.itemsCount || 1} قطعة</span>
                </div>
                <div className="p-2.5 bg-slate-50/80 rounded-xl border border-slate-200/80">
                  <span className="text-[10px] text-slate-400 block">حالة الطلبية</span>
                  <span className="font-black text-indigo-900 text-xs">
                    {selectedOrder.status === 'delivered' ? 'تم التسليم ✓' :
                     selectedOrder.status === 'shipped' ? 'في الشحن الدولي/المحلي' :
                     selectedOrder.status === 'purchased' ? 'تم الشراء من الموقع' : 'قيد الانتظار والطلب'}
                  </span>
                </div>
                <div className="p-2.5 bg-slate-50/80 rounded-xl border border-slate-200/80">
                  <span className="text-[10px] text-slate-400 block">قيمة السلة / الفرعي</span>
                  <span className="font-black text-slate-800 font-mono text-xs">
                    {(selectedOrder.subtotal || selectedOrder.totalAmount || 0).toLocaleString()} ر.ي
                  </span>
                </div>
                <div className="p-2.5 bg-slate-50/80 rounded-xl border border-slate-200/80">
                  <span className="text-[10px] text-slate-400 block">الشحن / التوصيل المحلي</span>
                  <span className="font-black text-slate-800 font-mono text-xs">
                    {((Number(selectedOrder.shippingFee) || 0) + (Number(selectedOrder.deliveryFee) || 0)).toLocaleString()} ر.ي
                  </span>
                </div>
              </div>

              {/* Description of items or Order Notes */}
              {((selectedOrder as any).itemsDescription || selectedOrder.notes) && (
                <div className="text-xs text-slate-700 bg-amber-50/60 p-3 rounded-xl border border-amber-200/70">
                  <span className="font-black text-amber-950 block mb-1">تفاصيل وملاحظات الطلبية:</span>
                  <p className="leading-relaxed">{(selectedOrder as any).itemsDescription || selectedOrder.notes}</p>
                </div>
              )}

              {/* Order Items Table if available */}
              {selectedOrder.items && selectedOrder.items.length > 0 && (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="bg-slate-50 px-3 py-2 border-b border-slate-200 text-[11px] font-black text-slate-700">
                    بنود وأصناف الفاتورة ({selectedOrder.items.length})
                  </div>
                  <div className="divide-y divide-slate-100 text-xs">
                    {selectedOrder.items.map((item, idx) => (
                      <div key={item.id || idx} className="px-3 py-2 flex items-center justify-between">
                        <div>
                          <span className="font-bold text-slate-800">{item.name}</span>
                          <span className="text-[11px] text-slate-400 mr-2">({item.quantity} × {Number(item.unitPrice).toLocaleString()})</span>
                        </div>
                        <span className="font-mono font-bold text-slate-900">{Number(item.total).toLocaleString()} ر.ي</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Order Financial Progress Cards */}
              <div className="grid grid-cols-3 gap-2.5 text-center">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[11px] text-slate-500 block mb-1">إجمالي قيمة الطلب</span>
                  <div className="text-base sm:text-lg font-black text-slate-900 font-mono">
                    {(selectedOrder.totalAmount || 0).toLocaleString()} <span className="text-[10px] text-slate-400">YER</span>
                  </div>
                </div>

                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                  <span className="text-[11px] text-emerald-800 block mb-1 font-bold">المبلغ المدفوع</span>
                  <div className="text-base sm:text-lg font-black text-emerald-700 font-mono">
                    {(selectedOrder.paidAmount || 0).toLocaleString()} <span className="text-[10px] text-emerald-600">YER</span>
                  </div>
                </div>

                <div className="p-3 bg-rose-50 rounded-xl border border-rose-200">
                  <span className="text-[11px] text-rose-800 block mb-1 font-bold">المتبقي المطلوب</span>
                  <div className="text-base sm:text-lg font-black text-rose-700 font-mono">
                    {(selectedOrder.remainingAmount || 0).toLocaleString()} <span className="text-[10px] text-rose-600">YER</span>
                  </div>
                </div>
              </div>

              {/* Payment Progress Bar */}
              <div>
                {(() => {
                  const total = selectedOrder.totalAmount || 1;
                  const paid = selectedOrder.paidAmount || 0;
                  const pct = Math.min(100, Math.round((paid / total) * 100));
                  return (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-slate-500">نسبة سداد قيمة الطلب:</span>
                        <span className="font-mono text-slate-900">{pct}%</span>
                      </div>
                      <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                        <div
                          className={`h-full transition-all duration-500 rounded-full ${
                            pct === 100 ? 'bg-emerald-500' : 'bg-gradient-to-r from-amber-500 to-emerald-500'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })()}
              </div>

            </div>

            {/* Panel 2: سجل الدفعات السابقة للطلب (Previous Payments) */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
                <div className="flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-base font-bold text-slate-900">
                    سجل الدفعات وسندات القبض السابقة للطلب ({previousPayments.length})
                  </h3>
                </div>
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsEditPaymentsMode(!isEditPaymentsMode)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition border cursor-pointer ${
                      isEditPaymentsMode
                        ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-2xs'
                        : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                    }`}
                    title="تفعيل وضع تعديل وحذف الدفعات المباشر"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>وضع تعديل الدفعات: {isEditPaymentsMode ? 'مفعّل ✓' : 'معطّل'}</span>
                  </button>
                  <span className="text-xs text-slate-400 font-mono">
                    إجمالي المسدد: {(selectedOrder.paidAmount || 0).toLocaleString()} YER
                  </span>
                </div>
              </div>

              {previousPayments.length === 0 ? (
                <div className="p-8 text-center space-y-2 bg-slate-50/70 rounded-xl border border-dashed border-slate-200">
                  <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center mx-auto">
                    <Clock className="w-5 h-5" />
                  </div>
                  <h4 className="font-bold text-xs text-slate-700">لم تُسجل أي دفعات سابقة لهذا الطلب بعد</h4>
                  <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                    يمكنك تسجيل العربون أو الدفعة الأولى لهذا الطلب مباشرة عبر النموذج على اليسار.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {previousPayments.map((pmt, idx) => (
                    <div
                      key={pmt.id}
                      className="p-3 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs"
                    >
                      <div className="flex items-start sm:items-center gap-2.5">
                        <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0 text-[11px] font-mono">
                          {previousPayments.length - idx}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-900">
                              {pmt.receiptNumber || pmt.paymentNumber}
                            </span>
                            <span className="px-2 py-0.2 rounded-md bg-white border border-slate-200 text-slate-700 font-bold text-[10px]">
                              {pmt.paymentType || 'سداد دفعة'}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            تاريخ: <span className="font-mono text-slate-700">{pmt.paymentDate ? pmt.paymentDate.split('T')[0] : '—'}</span> • الحساب: <span className="font-bold text-slate-800">{pmt.paymentMethod || 'محفظة'}</span>
                          </div>
                          {pmt.statement && (
                            <p className="text-[11px] text-slate-600 mt-0.5 italic">{pmt.statement}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200 flex-wrap">
                        <div className="font-mono font-black text-emerald-700 text-sm">
                          {Number(pmt.amount).toLocaleString()} YER
                        </div>

                        {isEditPaymentsMode && (
                          <button
                            type="button"
                            onClick={() => handleOpenEditPayment(pmt)}
                            className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold transition cursor-pointer flex items-center gap-1 shadow-2xs hover:scale-105"
                            title="تعديل بيانات وقيمة ومحفظة وسند الدفعة"
                          >
                            <Edit className="w-3.5 h-3.5 text-amber-600" />
                            <span>تعديل</span>
                          </button>
                        )}

                        {isEditPaymentsMode && (
                          <button
                            type="button"
                            onClick={() => handleDeleteDuplicatePayment(pmt)}
                            className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 text-xs font-bold transition cursor-pointer flex items-center gap-1 shadow-2xs hover:scale-105"
                            title="حذف هذه الدفعة وتصحيح رصيد الطلب فوراً"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                            <span>حذف المكرر</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            if (onOpenReceipt) onOpenReceipt(pmt);
                            else setReceiptToPrint(pmt);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-white hover:bg-indigo-50 text-indigo-700 border border-slate-200 hover:border-indigo-300 text-xs font-bold transition cursor-pointer flex items-center gap-1 shadow-2xs"
                          title="طباعة وعرض سند القبض الرسمي"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>سند القبض</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

            </div>

          </div>

          {/* Panel 3: الدفعة التي اريد ادفعها الان (5 Cols) */}
          <div className="lg:col-span-5 space-y-5">
            <div className="bg-white rounded-2xl border-2 border-amber-500/40 shadow-md p-5 space-y-4 sticky top-20">
              
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
                    <Plus className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">
                      الدفعة التي تريد دفعها الآن
                    </h3>
                    <span className="text-[11px] text-slate-400">
                      تسجيل دفعة جديدة للطلب #{selectedOrder.orderNumber}
                    </span>
                  </div>
                </div>

                <span className="font-mono text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg">
                  المتبقي: {currentRem.toLocaleString()} YER
                </span>
              </div>

              <form onSubmit={handleRecordPaymentNow} className="space-y-4 text-xs">
                
                {/* Payment Amount Input */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-800">
                      مبلغ الدفعة المراد سدادها الآن (YER) *
                    </label>
                    {currentRem > 0 && (
                      <button
                        type="button"
                        onClick={() => setPaymentAmount(String(currentRem))}
                        className="text-[11px] text-amber-700 hover:text-amber-900 font-bold underline cursor-pointer"
                      >
                        سداد كامل المتبقي ({currentRem.toLocaleString()} YER)
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      required
                      min="1"
                      placeholder="أدخل المبلغ..."
                      value={paymentAmount}
                      onChange={e => setPaymentAmount(e.target.value)}
                      className="w-full p-3 rounded-xl border-2 border-amber-500/50 focus:border-amber-500 focus:outline-none text-base font-black font-mono text-slate-900"
                    />
                    <span className="absolute left-3 top-3.5 text-xs text-slate-400 font-bold">
                      ريال يمني
                    </span>
                  </div>

                  {/* Quick Shortcut Buttons for Amount */}
                  {currentRem > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <button
                        type="button"
                        onClick={() => setPaymentAmount(String(currentRem))}
                        className="px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg text-[11px] font-bold cursor-pointer transition"
                      >
                        كامل المبلغ ({currentRem.toLocaleString()})
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentAmount(String(Math.round(currentRem / 2)))}
                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold cursor-pointer transition"
                      >
                        النصف ({Math.round(currentRem / 2).toLocaleString()})
                      </button>
                      {currentRem >= 5000 && (
                        <button
                          type="button"
                          onClick={() => setPaymentAmount('5000')}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold cursor-pointer transition"
                        >
                          5,000 YER
                        </button>
                      )}
                      {currentRem >= 10000 && (
                        <button
                          type="button"
                          onClick={() => setPaymentAmount('10000')}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold cursor-pointer transition"
                        >
                          10,000 YER
                        </button>
                      )}
                    </div>
                  )}

                  {/* Tafqeet in Arabic Words */}
                  {amountWords && (
                    <div className="mt-1.5 p-2 bg-slate-50 rounded-lg text-[11px] text-slate-600 font-medium">
                      فقط: <span className="font-bold text-slate-800">{amountWords} لا غير</span>
                    </div>
                  )}
                </div>

                {/* Payment Type & Date */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-800 block mb-1">نوع الدفعة</label>
                    <select
                      value={paymentType}
                      onChange={e => {
                        setPaymentType(e.target.value);
                        if (selectedOrder) {
                          setStatement(`سداد ${e.target.value} للطلب #${selectedOrder.orderNumber}`);
                        }
                      }}
                      className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-amber-500 bg-white text-xs font-bold"
                    >
                      <option value="عربون / دفعة أولى">عربون / دفعة أولى</option>
                      <option value="دفعة ثانية (شحن)">دفعة ثانية (عند الشحن)</option>
                      <option value="دفعة نهائية">دفعة نهائية (عند التسليم للمندوب)</option>
                      <option value="دفعة لاحقة">دفعة لاحقة</option>
                      <option value="سداد على الحساب">سداد على الحساب</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-800 block mb-1">تاريخ السداد</label>
                    <input
                      type="date"
                      value={paymentDate}
                      onChange={e => setPaymentDate(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-amber-500 font-mono text-xs"
                    />
                  </div>
                </div>

                {/* ============================================================== */}
                {/* SECTION: طريقة وقناة استلام الدفعة (محفظة / نقدي / مندوب) */}
                {/* ============================================================== */}
                <div className="space-y-3 bg-slate-50/90 p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
                  <div>
                    <label className="font-bold text-slate-800 block mb-1.5 text-xs">
                      طريقة وقناة استلام الدفعة *
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setPaymentChannel('wallet')}
                        className={`p-2.5 rounded-xl border-2 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                          paymentChannel === 'wallet'
                            ? 'border-[#1A3668] bg-blue-50/90 text-[#1A3668] shadow-xs font-black'
                            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100 font-bold'
                        }`}
                      >
                        <Wallet className="w-4 h-4 text-[#C5A059]" />
                        <span className="text-[11px]">محفظة / بنك</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setPaymentChannel('cash');
                          const cashAcc = availableAccounts.find(a => a.type === 'نقدي' || a.name.includes('الصندوق')) || availableAccounts[0];
                          if (cashAcc) setSelectedAccountId(cashAcc.id);
                        }}
                        className={`p-2.5 rounded-xl border-2 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                          paymentChannel === 'cash'
                            ? 'border-emerald-600 bg-emerald-50 text-emerald-950 shadow-xs font-black'
                            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100 font-bold'
                        }`}
                      >
                        <Banknote className="w-4 h-4 text-emerald-600" />
                        <span className="text-[11px]">نقداً في الصندوق</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentChannel('courier')}
                        className={`p-2.5 rounded-xl border-2 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                          paymentChannel === 'courier'
                            ? 'border-amber-600 bg-amber-50 text-amber-950 shadow-xs font-black'
                            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100 font-bold'
                        }`}
                      >
                        <Bike className="w-4 h-4 text-amber-600" />
                        <span className="text-[11px]">نقدي للمندوب</span>
                      </button>
                    </div>
                  </div>

                  {/* CHANNEL 1: WALLET & BANK (DEFAULT & MAIN CHANNEL) */}
                  {paymentChannel === 'wallet' && (
                    <div className="space-y-2.5 pt-1">
                      <div className="flex items-center justify-between">
                        <label className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                          <Wallet className="w-4 h-4 text-blue-700" />
                          <span>المحفظة أو الحساب المودع فيه * ({availableAccounts.length} محفظة متاحة)</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowQuickAddWallet(!showQuickAddWallet)}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-[#1A3668] hover:text-[#132c52] bg-white px-2.5 py-1 rounded-lg border border-blue-200 shadow-2xs hover:bg-blue-50 transition cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>{showQuickAddWallet ? 'إلغاء' : '+ إضافة محفظة جديدة'}</span>
                        </button>
                      </div>

                      {/* Inline Quick Add Wallet Card */}
                      {showQuickAddWallet && (
                        <div className="p-3 bg-white border-2 border-blue-300 rounded-xl space-y-2.5 shadow-xs">
                          <div className="text-[11px] font-black text-blue-900 border-b border-blue-100 pb-1.5 flex items-center gap-1">
                            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                            <span>إضافة محفظة أو حساب بنكي جديد فوراً:</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            <div>
                              <label className="text-[11px] font-bold text-slate-700 block mb-0.5">اسم المحفظة / الحساب *</label>
                              <input
                                type="text"
                                value={newWalletName}
                                onChange={e => setNewWalletName(e.target.value)}
                                placeholder="مثال: محفظة ون كاش، حساب الكريمي..."
                                className="w-full border border-blue-200 rounded-lg p-2 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-400 text-xs"
                              />
                            </div>
                            <div>
                              <label className="text-[11px] font-bold text-slate-700 block mb-0.5">نوع الحساب</label>
                              <select
                                value={newWalletType}
                                onChange={e => setNewWalletType(e.target.value as Account['type'])}
                                className="w-full border border-blue-200 rounded-lg p-2 bg-white font-medium text-xs"
                              >
                                <option value="محفظة">محفظة إلكترونية</option>
                                <option value="بنكي">حساب بنكي</option>
                                <option value="بطاقة">بطاقة دفع (VISA)</option>
                                <option value="نقدي">صندوق نقدي</option>
                              </select>
                            </div>
                          </div>
                          {quickAddError && (
                            <div className="text-[11px] text-rose-600 font-bold">{quickAddError}</div>
                          )}
                          <button
                            type="button"
                            onClick={handleQuickAddWallet}
                            className="w-full py-2 bg-[#1A3668] hover:bg-[#132c52] text-white rounded-lg font-bold text-xs shadow-xs transition cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#C5A059]" />
                            <span>حفظ المحفظة واختيارها الآن للدفعة</span>
                          </button>
                        </div>
                      )}

                      {/* Interactive Visual Wallet Selection Cards */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-48 overflow-y-auto p-1.5 border border-slate-200 rounded-xl bg-white shadow-2xs">
                        {availableAccounts.map(a => {
                          const isSelected = a.id === selectedAccountId;
                          const bal = getAccountBalance(a.id);
                          const IconComp = a.type === 'بنكي' ? Building2 : (a.type === 'بطاقة' ? CreditCard : (a.type === 'نقدي' ? Banknote : Wallet));
                          return (
                            <button
                              key={a.id}
                              type="button"
                              onClick={() => setSelectedAccountId(a.id)}
                              className={`p-2 rounded-xl text-right transition-all border flex flex-col justify-between gap-1 cursor-pointer ${
                                isSelected
                                  ? 'border-[#1A3668] bg-blue-50/90 ring-2 ring-[#1A3668]/30 shadow-xs'
                                  : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100 text-slate-700'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <IconComp className={`w-3.5 h-3.5 ${isSelected ? 'text-[#1A3668]' : 'text-slate-400'}`} />
                                {isSelected && <Check className="w-3.5 h-3.5 text-blue-700 font-black" />}
                              </div>
                              <div className="font-bold text-[11px] text-slate-900 truncate" title={a.name}>
                                {a.name}
                              </div>
                              <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                                <span className="text-[9px] px-1 py-0.2 rounded bg-white border border-slate-200">{a.type}</span>
                                <span className="font-bold text-slate-700">{bal.toLocaleString()} YER</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {/* Wallets Dropdown */}
                      <div className="relative">
                        <select
                          value={selectedAccountId}
                          onChange={e => setSelectedAccountId(Number(e.target.value))}
                          className="w-full border border-slate-300 rounded-xl p-2 bg-white font-bold text-slate-900 text-xs focus:ring-2 focus:ring-blue-500/20 shadow-2xs cursor-pointer"
                          required
                        >
                          {availableAccounts.map(a => {
                            const bal = getAccountBalance(a.id);
                            return (
                              <option key={a.id} value={a.id}>
                                {a.name} ({a.type}) — الرصيد: {bal.toLocaleString()} ريال
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      {/* Selected Wallet Quick Info Badge */}
                      {(() => {
                        if (!selectedAcc) return null;
                        const curBal = getAccountBalance(selectedAcc.id);
                        const newBal = curBal + (Number(numPayNow) || 0);
                        return (
                          <div className="flex items-center justify-between text-[11px] bg-blue-50/80 border border-blue-200/70 p-2 rounded-xl text-blue-950 font-medium">
                            <span>المحفظة المستلمة: <strong>{selectedAcc.name}</strong></span>
                            <span className="font-mono">الرصيد بعد الإيداع: <strong>{newBal.toLocaleString()} ريال</strong></span>
                          </div>
                        );
                      })()}

                      {/* Optional Courier delivery integration */}
                      <div className="pt-2 border-t border-slate-200/80">
                        <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 select-none mb-1.5">
                          <input
                            type="checkbox"
                            checked={hasCourierDelivery}
                            onChange={e => setHasCourierDelivery(e.target.checked)}
                            className="rounded text-blue-600 w-4 h-4 cursor-pointer"
                          />
                          <span>هل تم توصيل هذا الطلب عبر مندوب؟ (تسجيل استحقاق أجور التوصيل له)</span>
                        </label>

                        {hasCourierDelivery && (
                          <div className="p-2.5 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2 mt-1.5">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                              <div>
                                <label className="font-bold text-amber-950 block mb-0.5 text-[11px]">مندوب التوصيل *</label>
                                <select
                                  value={courierId}
                                  onChange={e => {
                                    const cId = Number(e.target.value);
                                    setCourierId(cId);
                                    const cObj = couriers.find(c => c.id === cId);
                                    if (cObj?.defaultDeliveryFee) setDeliveryFee(Number(cObj.defaultDeliveryFee));
                                  }}
                                  className="w-full border border-amber-300 rounded-lg p-2 bg-white font-bold text-slate-900 text-xs"
                                >
                                  {couriers.map(c => (
                                    <option key={c.id} value={c.id}>
                                      {c.name} ({c.zone || c.coverageZones || 'صنعاء'})
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="font-bold text-amber-950 block mb-0.5 text-[11px]">أجرة التوصيل المستحقة للمندوب *</label>
                                <input
                                  type="number"
                                  min="0"
                                  value={deliveryFee}
                                  onChange={e => setDeliveryFee(Number(e.target.value))}
                                  className="w-full border border-amber-300 rounded-lg p-2 bg-white font-mono font-bold text-amber-900 text-xs"
                                />
                              </div>
                            </div>
                            <div className="text-[10px] text-amber-900 font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                              <span>يدخل المبلغ في محفظة المتجر، ويُسجل للمندوب استحقاق أجور توصيل {Number(deliveryFee).toLocaleString()} ريال.</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* CHANNEL 2: CASH IN VAULT */}
                  {paymentChannel === 'cash' && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-emerald-950">
                        <Banknote className="w-4 h-4 text-emerald-700" />
                        <span>استلام نقدي مباشر في خزينة وصندوق المتجر</span>
                      </div>
                      {(() => {
                        const cashAcc = availableAccounts.find(a => a.type === 'نقدي' || a.name.includes('الصندوق')) || availableAccounts[0];
                        const curBal = cashAcc ? getAccountBalance(cashAcc.id) : 0;
                        const newBal = curBal + (Number(numPayNow) || 0);
                        return (
                          <div className="text-[11px] text-emerald-900 bg-white p-2 rounded-lg border border-emerald-200 space-y-1">
                            <div className="flex justify-between">
                              <span>حساب الصندوق المودع فيه:</span>
                              <strong className="font-bold">{cashAcc?.name || 'الصندوق'}</strong>
                            </div>
                            <div className="flex justify-between font-mono">
                              <span>الرصيد بعد الإيداع:</span>
                              <strong className="text-emerald-800">{newBal.toLocaleString()} ريال</strong>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* CHANNEL 3: CASH TO COURIER */}
                  {paymentChannel === 'courier' && (
                    <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 space-y-3">
                      <div className="flex items-center gap-2 text-xs font-black text-amber-950">
                        <Bike className="w-4 h-4 text-amber-700" />
                        <span>استلام نقدي عبر مندوب التوصيل (عهدة نقدية على المندوب)</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div>
                          <label className="font-bold text-amber-950 block mb-0.5 text-[11px]">المندوب المستلم *</label>
                          <select
                            value={courierId}
                            onChange={e => {
                              const cId = Number(e.target.value);
                              setCourierId(cId);
                              const cObj = couriers.find(c => c.id === cId);
                              if (cObj?.defaultDeliveryFee) setDeliveryFee(Number(cObj.defaultDeliveryFee));
                            }}
                            className="w-full border border-amber-300 rounded-lg p-2 bg-white font-bold text-slate-900 text-xs"
                          >
                            {couriers.map(c => (
                              <option key={c.id} value={c.id}>
                                {c.name} ({c.zone || c.coverageZones || 'صنعاء'})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="font-bold text-amber-950 block mb-0.5 text-[11px]">أجرة التوصيل المستحقة *</label>
                          <input
                            type="number"
                            min="0"
                            value={deliveryFee}
                            onChange={e => setDeliveryFee(Number(e.target.value))}
                            className="w-full border border-amber-300 rounded-lg p-2 bg-white font-mono font-bold text-amber-900 text-xs"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="font-bold text-amber-950 block text-[11px] mb-1">
                          المبلغ المسجل في عهدة المندوب ({selectedCourier?.name}):
                        </label>
                        <input
                          type="number"
                          value={courierCustodyAmount || ''}
                          onChange={e => {
                            setCourierCustodyAmount(Number(e.target.value));
                            setCustomCustodyEdited(true);
                          }}
                          className="w-full p-2 rounded-lg border border-amber-400 bg-white font-mono font-black text-amber-900 text-xs"
                        />
                      </div>
                      <div className="text-[10px] text-amber-900 font-bold">
                        ✓ يسجل برصيد المندوب {selectedCourier?.name}: <strong>طلب رقم #{selectedOrder.orderNumber}</strong> بمبلغ <strong>{(Number(courierCustodyAmount) || 0).toLocaleString()} ريال</strong>.
                      </div>
                    </div>
                  )}
                </div>

                {/* Statement & Notes */}
                <div>
                  <label className="font-bold text-slate-800 block mb-1">بيان سند القبض</label>
                  <input
                    type="text"
                    value={statement}
                    onChange={e => setStatement(e.target.value)}
                    placeholder="مثال: سداد عربون طلبية ملابس شي إن..."
                    className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-amber-500 text-xs"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-800 block mb-1">ملاحظات إضافية (اختياري)</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="رقم مرجع الحوالة أو ملاحظات التسليم..."
                    className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-amber-500 text-xs"
                  />
                </div>

                {/* Live Real-time Balance Calculation */}
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs space-y-1.5">
                  <div className="flex items-center justify-between text-slate-600">
                    <span>المتبقي الحالي على الطلب:</span>
                    <span className="font-mono font-bold text-slate-900">{currentRem.toLocaleString()} YER</span>
                  </div>
                  <div className="flex items-center justify-between text-emerald-700">
                    <span>المبلغ المدفوع الآن:</span>
                    <span className="font-mono font-bold">- {numPayNow.toLocaleString()} YER</span>
                  </div>
                  <div className="h-px bg-amber-200 my-1"></div>
                  <div className="flex items-center justify-between font-bold text-slate-900">
                    <span>المتبقي الجديد بعد هذه الدفعة:</span>
                    <span className={`font-mono text-sm ${remainingAfterPayment === 0 ? 'text-emerald-700 font-black' : 'text-rose-700'}`}>
                      {remainingAfterPayment === 0 ? '0 YER (سيسدد بالكامل! ✓)' : `${remainingAfterPayment.toLocaleString()} YER`}
                    </span>
                  </div>
                </div>

                {formError && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold">
                    {formError}
                  </div>
                )}

                {/* Submit Action Button */}
                <button
                  type="submit"
                  disabled={isSubmitting || numPayNow <= 0}
                  className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm shadow-md transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4 text-slate-950" />
                  <span>
                    {isSubmitting ? 'جاري الحفظ...' : `تأكيد وقبض الدفعة (${numPayNow.toLocaleString()} YER) ✓`}
                  </span>
                </button>
              </form>

            </div>
          </div>

        </div>
      ) : (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-xs">
          <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto mb-2" />
          <h3 className="text-base font-bold text-slate-700">لا توجد طلبات محددة</h3>
          <p className="text-xs text-slate-400 mt-1">اختر أي طلب من الجدول أدناه لاستعراض بياناته وسداد دفعاته.</p>
        </div>
      )}

      {/* Orders Directory Table for Fast Selection */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        
        {/* Table Header Controls */}
        <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900">قائمة طلبيات المتجر لاختيار وسداد الدفعات</h2>
            <span className="text-xs text-slate-400">({filteredOrders.length} طلبات)</span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute right-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="بحث برقم الطلب أو العميل..."
                className="w-full pr-9 pl-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-amber-500 font-sans"
              />
            </div>

            {/* Filter Chips */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs">
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                  filterStatus === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                الكل
              </button>
              <button
                onClick={() => setFilterStatus('unpaid')}
                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                  filterStatus === 'unpaid' ? 'bg-white text-rose-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                غير مسددة
              </button>
              <button
                onClick={() => setFilterStatus('paid')}
                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                  filterStatus === 'paid' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                مسددة بالكامل
              </button>
            </div>
          </div>
        </div>

        {/* Table Body */}
        {filteredOrders.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            لا توجد طلبيات تطابق معايير البحث المحددة.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50/80 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">رقم الطلب</th>
                  <th className="p-3">العميل</th>
                  <th className="p-3">المتجر / الموقع</th>
                  <th className="p-3">إجمالي الطلب</th>
                  <th className="p-3">المبلغ المدفوع</th>
                  <th className="p-3">المبلغ المتبقي</th>
                  <th className="p-3">نسبة السداد</th>
                  <th className="p-3 text-center">الإجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrders.map(order => {
                  const isSelected = selectedOrderId === order.id;
                  const total = order.totalAmount || 1;
                  const paid = order.paidAmount || 0;
                  const rem = order.remainingAmount || 0;
                  const pct = Math.min(100, Math.round((paid / total) * 100));

                  return (
                    <tr
                      key={order.id}
                      onClick={() => handleSelectOrder(order)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-amber-50/80 font-bold border-r-4 border-r-amber-500'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="p-3 font-mono font-bold text-slate-900">
                        #{order.orderNumber}
                      </td>
                      <td className="p-3">
                        <span className="font-bold text-slate-900 block">{order.customerName}</span>
                        {(order as any).customerPhone && (
                          <span className="text-[11px] text-slate-400 font-mono">{(order as any).customerPhone}</span>
                        )}
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-medium font-sans">
                          {order.site || 'شي إن'}
                        </span>
                      </td>
                      <td className="p-3 font-mono font-bold text-slate-800">
                        {(order.totalAmount || 0).toLocaleString()} YER
                      </td>
                      <td className="p-3 font-mono font-bold text-emerald-700">
                        {paid.toLocaleString()} YER
                      </td>
                      <td className="p-3 font-mono font-black text-rose-700">
                        {rem > 0 ? `${rem.toLocaleString()} YER` : '0 (مسدد)'}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${pct === 100 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="font-mono text-[11px] text-slate-500">{pct}%</span>
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectOrder(order);
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                            isSelected
                              ? 'bg-amber-500 text-slate-950 font-black'
                              : 'bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-900'
                          }`}
                        >
                          {isSelected ? 'محدد حالياً ✓' : 'اختيار وسداد'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* Modal لدمج وتوحيد طلبات العميل واعتماد الدفعات */}
      {isMergeOrdersModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 bg-gradient-to-r from-[#1A3668] to-[#122447] text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-300">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base">دمج وتوحيد طلبات العميل</h3>
                  <p className="text-xs text-blue-100">
                    اعتماد كافة الدفعات وسندات القبض في طلب واحد رئيسي دون فقدان أي بيانات
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMergeOrdersModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="p-3.5 bg-blue-50/80 rounded-2xl border border-blue-200/80 text-xs text-blue-900 space-y-1.5">
                <div className="font-bold flex items-center gap-1.5 text-[#1A3668]">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>العميل: {selectedCustomer?.name || selectedOrder?.customerName || 'غير محدد'}</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  اختر الطلب الرئيسي المعتمد الذي ترغب في تثبيته. سيقوم النظام آلياً بتحويل كافة سندات القبض والدفعات المسددة من الطلبات الأخرى وربطها بالطلب المعتمد، وجمع إجمالي القيمة والقطع دون لمس أو إلغاء أي دفعة مالية.
                </p>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-800 mb-2">
                  1. حدد الطلب المعتمد (Master Order) الذي ستجتمع فيه الدفعات:
                </label>
                <div className="space-y-2">
                  {selectedCustomerOrders.map(ord => {
                    const isMaster = (mergeTargetOrderId ?? selectedCustomerOrders[0]?.id) === ord.id;
                    const ordPayments = payments.filter(p => p.orderId === ord.id && p.status !== 'cancelled');
                    const ordPaidTotal = ordPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);

                    return (
                      <div
                        key={ord.id}
                        onClick={() => setMergeTargetOrderId(ord.id)}
                        className={`p-3 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isMaster
                            ? 'border-[#1A3668] bg-[#1A3668]/5 shadow-xs'
                            : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="mergeMasterOrder"
                            checked={isMaster}
                            onChange={() => setMergeTargetOrderId(ord.id)}
                            className="w-4 h-4 text-[#1A3668] focus:ring-[#1A3668] cursor-pointer"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-black text-sm text-slate-900">طلب #{ord.orderNumber}</span>
                              <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-mono">
                                ID: {ord.id}
                              </span>
                              {isMaster && (
                                <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-500 text-slate-950 font-black">
                                  الطلب المعتمد
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5">
                              <span>التاريخ: {ord.date}</span>
                              <span className="mx-1.5">•</span>
                              <span>الشحنة: {ord.shipmentNumber || 'غير محدد'}</span>
                            </div>
                          </div>
                        </div>

                        <div className="text-left font-mono">
                          <div className="text-xs font-black text-slate-900">
                            {Number(ord.totalAmount || 0).toLocaleString()} ر.ي
                          </div>
                          <div className="text-[11px] text-emerald-700 font-bold">
                            المدفوع: {ordPaidTotal.toLocaleString()} ر.ي ({ordPayments.length} سند)
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* الملخص المالي للدمج */}
              {(() => {
                const targetId = mergeTargetOrderId ?? selectedCustomerOrders[0]?.id;
                const allSelectedPayments = payments.filter(
                  p => selectedCustomerOrders.some(o => o.id === p.orderId) && p.status !== 'cancelled'
                );
                const totalAllPayments = allSelectedPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
                const totalAllAmount = selectedCustomerOrders.reduce((s, o) => s + (Number(o.totalAmount) || 0), 0);
                const newRemaining = Math.max(0, totalAllAmount - totalAllPayments);

                return (
                  <div className="p-4 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent rounded-2xl border border-amber-300 space-y-2">
                    <h5 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      نتيجة الاعتماد المالي بعد الدمج:
                    </h5>
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="p-2 bg-white rounded-xl border border-slate-200">
                        <span className="text-[10px] text-slate-500 block">إجمالي الطلب الموحد</span>
                        <strong className="font-mono text-slate-900">{totalAllAmount.toLocaleString()} ر.ي</strong>
                      </div>
                      <div className="p-2 bg-white rounded-xl border border-emerald-200 text-emerald-800">
                        <span className="text-[10px] text-emerald-600 block">كافة الدفعات المعتمدة ({allSelectedPayments.length} سند)</span>
                        <strong className="font-mono font-black">{totalAllPayments.toLocaleString()} ر.ي</strong>
                      </div>
                      <div className="p-2 bg-white rounded-xl border border-rose-200 text-rose-800">
                        <span className="text-[10px] text-rose-600 block">المتبقي على العميل</span>
                        <strong className="font-mono font-black">{newRemaining.toLocaleString()} ر.ي</strong>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsMergeOrdersModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => {
                  const targetId = mergeTargetOrderId ?? selectedCustomerOrders[0]?.id;
                  if (!targetId) return;
                  const ordersToMerge = selectedCustomerOrders.filter(o => o.id !== targetId).map(o => o.id);
                  if (ordersToMerge.length === 0) {
                    setIsMergeOrdersModalOpen(false);
                    return;
                  }
                  consolidateOrders(targetId, ordersToMerge);
                  setSelectedOrderId(targetId);
                  setIsMergeOrdersModalOpen(false);
                }}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 text-xs font-black shadow-md transition cursor-pointer flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>تأكيد دمج الطلبات واعتماد كامل الدفعات</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Official Receipt Modal when Payment is printed / issued */}
      {receiptToPrint && (
        <ReceiptModal
          isOpen={true}
          payment={receiptToPrint}
          onClose={() => setReceiptToPrint(null)}
        />
      )}

      {/* Modal: تعديل الدفعة المباشر داخل قسم دفعات الطلبات والتحصيل */}
      {editingPaymentItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center text-white">
                  <Edit className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base">تعديل الدفعة المستلمة</h3>
                  <p className="text-xs text-amber-100">
                    سند قبض #{editingPaymentItem.receiptNumber || editingPaymentItem.paymentNumber} • الطلب #{selectedOrder?.orderNumber || editingPaymentItem.orderId}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingPaymentItem(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePaymentEdit} className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 leading-relaxed">
                <strong>تنبيه مالي:</strong> أي تعديل على مبلغ أو تاريخ الدفعة سيقوم فوراً بتحديث الرصيد المدفوع والمتبقي للطلب، وحساب المحفظة، والأستاذ العام وقيد اليومية آلياً.
              </div>

              {/* Amount */}
              <div>
                <label className="font-bold text-slate-800 block mb-1">
                  مبلغ الدفعة المحصل (YER) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  step="any"
                  value={editPaymentAmount}
                  onChange={e => setEditPaymentAmount(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 font-mono font-black text-sm text-slate-900 focus:outline-none focus:border-amber-600"
                />
              </div>

              {/* Account / Wallet */}
              <div>
                <label className="font-bold text-slate-800 block mb-1">
                  المحفظة / الحساب المستلم *
                </label>
                <select
                  value={editPaymentAccountId}
                  onChange={e => setEditPaymentAccountId(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-slate-300 font-bold text-xs text-slate-900 focus:outline-none focus:border-amber-600"
                >
                  {availableAccounts.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.type})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Date */}
                <div>
                  <label className="font-bold text-slate-800 block mb-1">
                    تاريخ الدفعة *
                  </label>
                  <input
                    type="date"
                    required
                    value={editPaymentDate}
                    onChange={e => setEditPaymentDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-bold text-xs text-slate-900 focus:outline-none focus:border-amber-600"
                  />
                </div>

                {/* Receipt Number */}
                <div>
                  <label className="font-bold text-slate-800 block mb-1">
                    رقم سند القبض
                  </label>
                  <input
                    type="text"
                    value={editReceiptNumber}
                    onChange={e => setEditReceiptNumber(e.target.value)}
                    placeholder="مثال: RCT-2026-041"
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-mono font-bold text-xs text-slate-900 focus:outline-none focus:border-amber-600"
                  />
                </div>
              </div>

              {/* Payment Type */}
              <div>
                <label className="font-bold text-slate-800 block mb-1">
                  نوع وتصنيف الدفعة
                </label>
                <select
                  value={editPaymentType}
                  onChange={e => setEditPaymentType(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 font-bold text-xs text-slate-900 focus:outline-none focus:border-amber-600"
                >
                  <option value="عربون / دفعة أولى">عربون / دفعة أولى</option>
                  <option value="دفعة لاحقة">دفعة لاحقة</option>
                  <option value="دفعة نهائية">دفعة نهائية</option>
                  <option value="سداد دفعة">سداد دفعة</option>
                  <option value="تحصيل رصيد افتتاحي">تحصيل رصيد افتتاحي</option>
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="font-bold text-slate-800 block mb-1">
                  البيان والملاحظات
                </label>
                <input
                  type="text"
                  value={editPaymentNotes}
                  onChange={e => setEditPaymentNotes(e.target.value)}
                  placeholder="ملاحظات أو سبب التعديل..."
                  className="w-full p-2.5 rounded-xl border border-slate-300 font-bold text-xs text-slate-900 focus:outline-none focus:border-amber-600"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingPaymentItem(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black shadow-md transition cursor-pointer flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSavingEdit ? 'جارِ الحفظ...' : 'حفظ التعديلات واعتماد الأرصدة'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
