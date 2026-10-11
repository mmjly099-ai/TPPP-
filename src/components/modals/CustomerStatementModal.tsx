import React, { useState, useMemo } from 'react';
import {
  X,
  Printer,
  Receipt,
  FileText,
  Calendar,
  Filter,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  Share2,
  Copy,
  Check,
  Building2,
  User,
  ShoppingBag,
  Truck,
  Layers,
  ShieldCheck
} from 'lucide-react';
import { Customer, Order, Payment } from '../../types';
import { useStore } from '../../context/StoreContext';
import { numberToArabicWords } from '../../utils/tafqeet';
import { TopStoreOfficialStatement } from '../documents/TopStoreOfficialStatement';

interface CustomerStatementModalProps {
  customer: Customer | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenPaymentForCustomer?: (customer: Customer) => void;
  onOpenOrderInvoice?: (order: Order) => void;
  onOpenReceipt?: (payment: Payment) => void;
}

interface StatementEntry {
  id: string;
  date: string;
  type: 'order' | 'payment' | 'opening_balance';
  typeLabel: string;
  operationNumber: string; // رقم العملية
  orderNumber: string;    // رقم الطلب
  shipmentNumber: string; // رقم الشحنة
  description: string;    // البيان
  debit: number;          // مدين (مبالغ مستحقة على العميل)
  credit: number;         // دائن (مقبوضات مسددة من العميل)
  balance: number;        // الرصيد التراكمي
  rawOrder?: Order;
  rawPayment?: Payment;
}

export const CustomerStatementModal: React.FC<CustomerStatementModalProps> = ({
  customer,
  isOpen,
  onClose,
  onOpenPaymentForCustomer,
  onOpenOrderInvoice,
  onOpenReceipt
}) => {
  const { settings, orders, payments, getCustomerBalance } = useStore();
  
  // Statement filters
  const [layoutMode, setLayoutMode] = useState<'official' | 'classic'>('official');
  const [statementMode, setStatementMode] = useState<'standard' | 'comprehensive'>('standard');
  const [filterType, setFilterType] = useState<'all' | 'orders' | 'payments'>('all');
  const [selectedOrderId, setSelectedOrderId] = useState<string>('all');
  const [selectedShipment, setSelectedShipment] = useState<string>('all');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [copied, setCopied] = useState(false);

  if (!isOpen || !customer) return null;

  const storeName = settings.storeName || 'TOP STORE – توب ستور';
  const businessName = settings.businessName || 'وسيط شراء وتسوق إلكتروني';
  const phone = settings.phone || '772791991';
  const whatsapp = settings.whatsapp || '784960100';

  const openingBalance = parseFloat(String(customer.openingBalance || 0)) || 0;
  const currentTotalDebt = getCustomerBalance(customer.id);

  // Customer raw data
  const rawCustomerOrders = orders.filter(o => o.customerId === customer.id && o.status !== 'cancelled');
  const rawCustomerPayments = payments.filter(p => p.customerId === customer.id && p.status !== 'cancelled');

  // Distinct shipments for this customer
  const customerShipments = Array.from(
    new Set(rawCustomerOrders.map(o => o.shipmentNumber).filter(Boolean))
  ) as string[];

  // Top Customer Summary KPIs (Requirement 9)
  const totalOrdersCount = rawCustomerOrders.length;
  const totalOrdersValue = rawCustomerOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const totalPaidSum = rawCustomerPayments.reduce((sum, p) => sum + p.amount, 0);
  const totalRemainingSum = rawCustomerOrders.reduce((sum, o) => sum + (o.remainingAmount || 0), 0);

  // Build unified chronological ledger entries (Debit/Credit)
  const allChronologicalEntries: StatementEntry[] = useMemo(() => {
    type RawAction = {
      date: string;
      order?: Order;
      payment?: Payment;
    };

    const actions: RawAction[] = [
      ...rawCustomerOrders.map(o => ({ date: o.orderDate, order: o })),
      ...rawCustomerPayments.map(p => ({ date: p.paymentDate, payment: p }))
    ];

    // Sort ascending chronologically
    actions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let runningBalance = openingBalance;
    const entries: StatementEntry[] = [];

    // Optional opening balance row if exists
    if (openingBalance !== 0) {
      entries.push({
        id: 'opening',
        date: customer.createdAt ? customer.createdAt.split('T')[0] : '2026-01-01',
        type: 'opening_balance',
        typeLabel: 'رصيد افتتاحي',
        operationNumber: 'BAL-INIT',
        orderNumber: '-',
        shipmentNumber: '-',
        description: 'رصيد سابق / ذمة افتتاحية مرحلة',
        debit: openingBalance > 0 ? openingBalance : 0,
        credit: openingBalance < 0 ? Math.abs(openingBalance) : 0,
        balance: openingBalance
      });
    }

    actions.forEach((act, idx) => {
      if (act.order) {
        const debitAmount = act.order.totalAmount || 0;
        runningBalance += debitAmount;
        const opNum = act.order.invoiceNumber || `INV-${act.order.orderNumber}`;
        entries.push({
          id: `ord-${act.order.id}-${idx}`,
          date: act.order.orderDate,
          type: 'order',
          typeLabel: 'فاتورة طلب',
          operationNumber: opNum,
          orderNumber: `#${act.order.orderNumber}`,
          shipmentNumber: act.order.shipmentNumber ? `#${act.order.shipmentNumber}` : '-',
          description: `فاتورة شراء موقع ${act.order.site} (${act.order.itemsCount} قطع)`,
          debit: debitAmount,
          credit: 0,
          balance: runningBalance,
          rawOrder: act.order
        });
      } else if (act.payment) {
        const creditAmount = act.payment.amount || 0;
        runningBalance -= creditAmount;
        const linkedOrder = act.payment.orderId ? orders.find(o => o.id === act.payment.orderId) : undefined;
        const opNum = act.payment.receiptNumber || act.payment.paymentNumber.replace('PAY-', 'RCT-');
        entries.push({
          id: `pay-${act.payment.id}-${idx}`,
          date: act.payment.paymentDate,
          type: 'payment',
          typeLabel: 'سند قبض',
          operationNumber: opNum,
          orderNumber: linkedOrder ? `#${linkedOrder.orderNumber}` : '-',
          shipmentNumber: linkedOrder?.shipmentNumber ? `#${linkedOrder.shipmentNumber}` : '-',
          description: act.payment.statement || act.payment.notes || `سداد دفعة عبر ${act.payment.paymentMethod}`,
          debit: 0,
          credit: creditAmount,
          balance: runningBalance,
          rawPayment: act.payment
        });
      }
    });

    return entries;
  }, [customer, rawCustomerOrders, rawCustomerPayments, orders, openingBalance]);

  // Filter entries according to date, type, order, and shipment (Requirements 6 & 8)
  const filteredEntries = useMemo(() => {
    return allChronologicalEntries.filter(entry => {
      if (filterType === 'orders' && entry.type !== 'order') return false;
      if (filterType === 'payments' && entry.type !== 'payment') return false;

      // Filter by specific order
      if (selectedOrderId !== 'all') {
        const orderNum = `#${selectedOrderId}`;
        if (entry.orderNumber !== orderNum && entry.orderNumber !== selectedOrderId) return false;
      }

      // Filter by shipment
      if (selectedShipment !== 'all') {
        const shpNum = `#${selectedShipment}`;
        if (entry.shipmentNumber !== shpNum && entry.shipmentNumber !== selectedShipment) return false;
      }

      // Date bounds (only apply in standard mode or when explicitly filled)
      if (statementMode === 'standard') {
        if (fromDate && entry.date < fromDate) return false;
        if (toDate && entry.date > toDate) return false;
      } else {
        // In comprehensive mode, if dates are entered, filter them, otherwise include everything
        if (fromDate && entry.date < fromDate) return false;
        if (toDate && entry.date > toDate) return false;
      }

      return true;
    });
  }, [allChronologicalEntries, filterType, selectedOrderId, selectedShipment, fromDate, toDate, statementMode]);

  // Aggregated totals of the visible ledger
  const totalDebit = filteredEntries.reduce((sum, e) => sum + e.debit, 0);
  const totalCredit = filteredEntries.reduce((sum, e) => sum + e.credit, 0);
  const netDue = filteredEntries.length > 0
    ? filteredEntries[filteredEntries.length - 1].balance
    : currentTotalDebt;

  const handlePrint = () => {
    window.print();
  };

  const handleCopyWhatsAppText = () => {
    const text = `📋 *كشف حساب مالي - ${storeName}*
----------------------------------
🔹 *العميل:* ${customer.name}
🔹 *كود العميل:* ${customer.code}
🔹 *رقم الهاتف:* ${customer.phone || '-'}
🔹 *إجمالي قيمة الطلبات:* ${totalOrdersValue.toLocaleString()} ريال
🔹 *إجمالي المسدد:* ${totalPaidSum.toLocaleString()} ريال
🔹 *صافي الرصيد المستحق:* ${currentTotalDebt.toLocaleString()} ريال يمني
----------------------------------
*تفاصيل الحركات الأخيرة (${filteredEntries.length} حركة):*
${filteredEntries.slice(-5).map(e => `• ${e.date} | ${e.typeLabel} (${e.operationNumber}) | مدين: ${e.debit} | دائن: ${e.credit} | الرصيد: ${e.balance.toLocaleString()}`).join('\n')}
----------------------------------
شكراً لتعاملكم مع توب ستور للوساطة والتسوق الإلكتروني ✨
للاستفسار: ${whatsapp}`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto print:p-0 print:static print:bg-white" dir="rtl">
      <div className="bg-white rounded-2xl max-w-5xl w-full p-4 sm:p-6 shadow-2xl space-y-4 my-6 print:shadow-none print:m-0 print:max-w-none print:p-4 border border-slate-200">
        
        {/* Modal Controls (Hidden in Print) */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-slate-100 pb-3 print:hidden">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800 text-sm">
              {statementMode === 'comprehensive' ? '📄 كشف حساب شامل (كامل السجل)' : '📋 كشف حساب العميل'}
            </span>
            <span className="font-mono text-xs bg-[#1A3668]/10 text-[#1A3668] px-2.5 py-0.5 rounded-full font-bold">
              {customer.code}
            </span>
            <span className="text-xs text-slate-600 font-medium truncate max-w-[160px]">
              ({customer.name})
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Design Layout Switcher */}
            <div className="flex bg-[#112952]/10 rounded-lg p-0.5 text-xs font-bold border border-[#112952]/20">
              <button
                onClick={() => setLayoutMode('official')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
                  layoutMode === 'official'
                    ? 'bg-[#112952] text-white shadow-xs'
                    : 'text-slate-700 hover:text-slate-900'
                }`}
                title="تنسيق توب ستور الرسمي الفاخر"
              >
                <span>⭐ التصميم الرسمي</span>
              </button>
              <button
                onClick={() => setLayoutMode('classic')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  layoutMode === 'classic'
                    ? 'bg-white text-[#112952] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="التصميم التقليدي"
              >
                <span>التقليدي</span>
              </button>
            </div>

            {/* Toggle Statement Mode */}
            <div className="flex bg-slate-100 rounded-lg p-0.5 text-xs font-bold">
              <button
                onClick={() => setStatementMode('standard')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  statementMode === 'standard'
                    ? 'bg-white text-[#1A3668] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                كشف الفترة
              </button>
              <button
                onClick={() => {
                  setStatementMode('comprehensive');
                  setFromDate('');
                  setToDate('');
                  setFilterType('all');
                }}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  statementMode === 'comprehensive'
                    ? 'bg-[#1A3668] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                كشف شامل
              </button>
            </div>

            <button
              onClick={handleCopyWhatsAppText}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold transition-colors cursor-pointer border border-emerald-200"
              title="نسخ ملخص كشف الحساب لمشاركته عبر واتساب"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'تم النسخ!' : 'نص الواتساب'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1A3668] hover:bg-[#152c54] text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>طباعة الكشف</span>
            </button>

            {onOpenPaymentForCustomer && currentTotalDebt > 0 && (
              <button
                onClick={() => {
                  onClose();
                  onOpenPaymentForCustomer(customer);
                }}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>سند قبض</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Toolbar (Hidden in Print) */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2 text-xs print:hidden">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-slate-700 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-slate-500" />
                <span>تصفية العمليات:</span>
              </span>
              
              <div className="flex rounded-lg bg-white border border-slate-200 p-0.5">
                <button
                  onClick={() => setFilterType('all')}
                  className={`px-2.5 py-1 rounded-md font-bold transition-colors cursor-pointer ${filterType === 'all' ? 'bg-[#1A3668] text-white' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  الكل
                </button>
                <button
                  onClick={() => setFilterType('orders')}
                  className={`px-2.5 py-1 rounded-md font-bold transition-colors cursor-pointer ${filterType === 'orders' ? 'bg-[#1A3668] text-white' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  فواتير الطلبات فقط
                </button>
                <button
                  onClick={() => setFilterType('payments')}
                  className={`px-2.5 py-1 rounded-md font-bold transition-colors cursor-pointer ${filterType === 'payments' ? 'bg-[#1A3668] text-white' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  سندات القبض فقط
                </button>
              </div>

              {/* Specific Order Filter */}
              {rawCustomerOrders.length > 0 && (
                <div className="flex items-center gap-1">
                  <span className="text-slate-500 text-[11px]">الطلب:</span>
                  <select
                    value={selectedOrderId}
                    onChange={e => setSelectedOrderId(e.target.value)}
                    className="bg-white border border-slate-200 rounded-md px-2 py-1 text-[11px] font-bold"
                  >
                    <option value="all">كل الطلبات ({rawCustomerOrders.length})</option>
                    {rawCustomerOrders.map(o => (
                      <option key={o.id} value={o.orderNumber}>
                        طلب #{o.orderNumber} ({o.site})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Specific Shipment Filter */}
              {customerShipments.length > 0 && (
                <div className="flex items-center gap-1">
                  <span className="text-slate-500 text-[11px]">الشحنة:</span>
                  <select
                    value={selectedShipment}
                    onChange={e => setSelectedShipment(e.target.value)}
                    className="bg-white border border-slate-200 rounded-md px-2 py-1 text-[11px] font-bold"
                  >
                    <option value="all">كل الشحنات</option>
                    {customerShipments.map(shp => (
                      <option key={shp} value={shp}>
                        شحنة #{shp}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Date bounds */}
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <div className="flex items-center gap-1 text-[11px]">
                <span>من:</span>
                <input
                  type="date"
                  value={fromDate}
                  onChange={e => setFromDate(e.target.value)}
                  className="bg-white border border-slate-200 rounded px-1.5 py-0.5 font-mono text-[11px]"
                />
              </div>
              <div className="flex items-center gap-1 text-[11px]">
                <span>إلى:</span>
                <input
                  type="date"
                  value={toDate}
                  onChange={e => setToDate(e.target.value)}
                  className="bg-white border border-slate-200 rounded px-1.5 py-0.5 font-mono text-[11px]"
                />
              </div>
              {(fromDate || toDate || filterType !== 'all' || selectedOrderId !== 'all' || selectedShipment !== 'all') && (
                <button
                  onClick={() => {
                    setFromDate('');
                    setToDate('');
                    setFilterType('all');
                    setSelectedOrderId('all');
                    setSelectedShipment('all');
                  }}
                  className="text-rose-600 font-bold hover:underline cursor-pointer text-[10px]"
                >
                  إلغاء التصفية
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Printable Statement Document */}
        {layoutMode === 'official' ? (
          <TopStoreOfficialStatement
            customer={customer}
            entries={filteredEntries}
            openingBalance={openingBalance}
            totalOrdersCount={totalOrdersCount}
            totalOrdersValue={totalOrdersValue}
            totalPaidSum={totalPaidSum}
            totalRemainingSum={totalRemainingSum}
            totalDebit={totalDebit}
            totalCredit={totalCredit}
            netDue={netDue}
            fromDate={fromDate}
            toDate={toDate}
            statementMode={statementMode}
            onOpenOrderInvoice={onOpenOrderInvoice}
            onOpenReceipt={onOpenReceipt}
          />
        ) : (
          <div className="space-y-4 print:space-y-3.5 text-slate-900 text-xs">
          
          {/* 1️⃣ HEADER: Clean, Official, Branded with Logo */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 border-b border-slate-200 gap-3">
            <div className="flex items-center gap-3">
              <div className="w-13 h-13 sm:w-16 sm:h-16 rounded-2xl bg-white p-1 border-2 border-[#C5A059] shadow-md flex items-center justify-center shrink-0 overflow-hidden">
                <img
                  src="/top_store_logo.jpg"
                  alt="شعار توب ستور TOP STORE"
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg sm:text-xl font-black text-[#1A3668] tracking-tight">TOP STORE</h1>
                  <span className="text-xs font-bold text-[#C5A059]">توب ستور</span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium">نظام إدارة الحسابات والمبيعات المعتمد</p>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">{phone} | {whatsapp}</p>
              </div>
            </div>

            <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
              <div className="inline-flex items-center gap-1.5 bg-[#1A3668]/5 text-[#1A3668] border border-[#1A3668]/20 px-3 py-1 rounded-lg text-xs font-black">
                <FileText className="w-3.5 h-3.5 text-[#C5A059]" />
                <span>{statementMode === 'comprehensive' ? 'كشف حساب شامل' : 'كشف حساب عميل'}</span>
              </div>
              <div className="text-left sm:text-left text-[11px] font-mono mt-1 space-y-0.5">
                <div className="text-slate-900 font-bold">
                  <span className="text-slate-400 font-sans ml-1 text-[10px]">كود العميل:</span>
                  {customer.code}
                </div>
                <div className="text-slate-600 text-[10px]">
                  <span className="text-slate-400 font-sans ml-1">تاريخ الإصدار:</span>
                  {new Date().toLocaleDateString('ar-YE')}
                </div>
                <div className="text-slate-500 text-[10px] font-sans">
                  الفترة: {fromDate || 'البداية'} إلى {toDate || 'الآن'}
                </div>
              </div>
            </div>
          </div>

          {/* 2️⃣ TOP CUSTOMER SUMMARY (ملخص العميل - Requirement 9) */}
          <div className="bg-[#f8fafc] border border-slate-200/90 rounded-xl p-3.5 sm:p-4 space-y-3">
            {/* Customer Basic Info Strip */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-200/80">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[#1A3668]/10 text-[#1A3668] flex items-center justify-center">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <strong className="text-slate-900 font-black text-sm">{customer.name}</strong>
                    <span className="text-[10px] font-mono font-bold text-[#1A3668] bg-[#1A3668]/5 border border-[#1A3668]/20 px-2 py-0.5 rounded">
                      {customer.code}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                    <span dir="ltr" className="font-mono font-medium">{customer.phone || '-'}</span>
                    <span>•</span>
                    <span>{customer.governorate || 'صنعاء'}</span>
                    {customer.pickupLocation && (
                      <>
                        <span>•</span>
                        <span>{customer.pickupLocation}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-medium">حالة الحساب:</span>
                {currentTotalDebt > 0 ? (
                  <span className="inline-flex items-center gap-1 text-[#8a6820] font-bold bg-amber-50 border border-amber-300 px-2.5 py-0.5 rounded-lg text-xs">
                    <span>مديونية مستحقة: {currentTotalDebt.toLocaleString()} ريال</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-emerald-800 font-bold bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-lg text-xs">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>خالص الذمة (لا ديون)</span>
                  </span>
                )}
              </div>
            </div>

            {/* KPI Cards: Exact numbers requested in 9️⃣ */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 text-center">
              <div className="p-2.5 rounded-lg border border-slate-200 bg-white">
                <span className="text-[10px] text-slate-400 block font-medium">إجمالي الطلبات</span>
                <span className="font-mono font-black text-slate-800 text-xs sm:text-sm block mt-0.5">
                  {totalOrdersCount} <span className="text-[10px] font-sans font-normal text-slate-500">طلب</span>
                </span>
              </div>

              <div className="p-2.5 rounded-lg border border-slate-200 bg-white">
                <span className="text-[10px] text-slate-400 block font-medium">إجمالي قيمة الطلبات</span>
                <span className="font-mono font-bold text-slate-900 text-xs sm:text-sm block mt-0.5">
                  {totalOrdersValue.toLocaleString()} <span className="text-[10px] font-sans font-normal text-slate-500">ريال</span>
                </span>
              </div>

              <div className="p-2.5 rounded-lg border border-emerald-200/80 bg-emerald-50/40">
                <span className="text-[10px] text-emerald-800 block font-medium">إجمالي المدفوع</span>
                <span className="font-mono font-bold text-emerald-800 text-xs sm:text-sm block mt-0.5">
                  {totalPaidSum.toLocaleString()} <span className="text-[10px] font-sans font-normal text-emerald-600">ريال</span>
                </span>
              </div>

              <div className="p-2.5 rounded-lg border border-amber-200/80 bg-amber-50/40">
                <span className="text-[10px] text-[#8a6820] block font-medium">إجمالي المتبقي</span>
                <span className="font-mono font-bold text-[#8a6820] text-xs sm:text-sm block mt-0.5">
                  {totalRemainingSum.toLocaleString()} <span className="text-[10px] font-sans font-normal text-slate-600">ريال</span>
                </span>
              </div>

              {openingBalance !== 0 && (
                <div className="p-2.5 rounded-lg border border-slate-200 bg-white">
                  <span className="text-[10px] text-slate-400 block font-medium">رصيد افتتاحي</span>
                  <span className="font-mono font-bold text-slate-700 text-xs sm:text-sm block mt-0.5">
                    {openingBalance.toLocaleString()} <span className="text-[10px] font-sans font-normal text-slate-500">ريال</span>
                  </span>
                </div>
              )}

              <div className="p-2.5 rounded-lg border border-rose-200/80 bg-rose-50/30">
                <span className="text-[10px] text-rose-700 block font-semibold flex items-center justify-center gap-0.5">
                  <ArrowDownLeft className="w-3 h-3" />
                  <span>إجمالي المدين</span>
                </span>
                <span className="font-mono font-bold text-rose-800 text-xs sm:text-sm block mt-0.5">
                  {totalDebit.toLocaleString()} <span className="text-[10px] font-sans font-normal text-rose-600">ريال</span>
                </span>
              </div>

              <div className="p-2.5 rounded-lg border border-emerald-200/80 bg-emerald-50/30">
                <span className="text-[10px] text-emerald-700 block font-semibold flex items-center justify-center gap-0.5">
                  <ArrowUpRight className="w-3 h-3" />
                  <span>إجمالي الدائن</span>
                </span>
                <span className="font-mono font-bold text-emerald-800 text-xs sm:text-sm block mt-0.5">
                  {totalCredit.toLocaleString()} <span className="text-[10px] font-sans font-normal text-emerald-600">ريال</span>
                </span>
              </div>

              <div className="col-span-2 sm:col-span-4 lg:col-span-1 p-2.5 rounded-lg border border-[#C5A059]/50 bg-amber-50/60">
                <span className="text-[10px] text-[#8a6820] block font-bold">الرصيد النهائي</span>
                <span className={`font-mono font-black text-xs sm:text-sm block mt-0.5 ${netDue > 0 ? 'text-[#8a6820]' : 'text-emerald-800'}`}>
                  {netDue.toLocaleString()} <span className="text-[10px] font-sans font-normal text-slate-600">ريال</span>
                </span>
              </div>
            </div>
          </div>

          {/* 3️⃣ DETAILED LEDGER TABLE (الأعمدة التسعة المطلوبة نصاً في 6️⃣) */}
          <div className="border border-slate-200/90 rounded-xl overflow-hidden bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-[#1A3668]/5 font-bold text-slate-800 border-b border-slate-200 text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3 whitespace-nowrap">1. التاريخ</th>
                    <th className="py-2.5 px-2 whitespace-nowrap">2. نوع العملية</th>
                    <th className="py-2.5 px-2 whitespace-nowrap">3. رقم العملية</th>
                    <th className="py-2.5 px-2 whitespace-nowrap">4. رقم الطلب</th>
                    <th className="py-2.5 px-2 whitespace-nowrap">5. رقم الشحنة</th>
                    <th className="py-2.5 px-3 min-w-[180px]">6. البيان</th>
                    <th className="py-2.5 px-2 text-left text-rose-800 whitespace-nowrap">7. مدين (عليه)</th>
                    <th className="py-2.5 px-2 text-left text-emerald-800 whitespace-nowrap">8. دائن (له)</th>
                    <th className="py-2.5 px-3 text-left whitespace-nowrap">9. الرصيد</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {filteredEntries.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400 font-sans">
                        لا توجد حركات مسجلة للعميل تطابق شروط التصفية المحددة
                      </td>
                    </tr>
                  ) : (
                    filteredEntries.map(entry => (
                      <tr key={entry.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2 px-3 text-slate-600 whitespace-nowrap">{entry.date}</td>
                        <td className="py-2 px-2 font-sans font-medium whitespace-nowrap">
                          <span
                            className={`inline-block px-1.5 py-0.5 rounded text-[10px] ${
                              entry.type === 'order'
                                ? 'bg-[#1A3668]/10 text-[#1A3668] border border-[#1A3668]/20'
                                : entry.type === 'payment'
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {entry.typeLabel}
                          </span>
                        </td>
                        <td className="py-2 px-2 font-bold text-slate-800 whitespace-nowrap">
                          {entry.type === 'order' && entry.rawOrder && onOpenOrderInvoice ? (
                            <button
                              onClick={() => onOpenOrderInvoice(entry.rawOrder!)}
                              className="text-[#1A3668] hover:underline cursor-pointer font-bold"
                              title="عرض فاتورة الطلب"
                            >
                              {entry.operationNumber}
                            </button>
                          ) : entry.type === 'payment' && entry.rawPayment && onOpenReceipt ? (
                            <button
                              onClick={() => onOpenReceipt(entry.rawPayment!)}
                              className="text-emerald-700 hover:underline cursor-pointer font-bold"
                              title="عرض سند القبض"
                            >
                              {entry.operationNumber}
                            </button>
                          ) : (
                            entry.operationNumber
                          )}
                        </td>
                        <td className="py-2 px-2 text-slate-700 font-bold whitespace-nowrap">
                          {entry.orderNumber}
                        </td>
                        <td className="py-2 px-2 text-slate-600 whitespace-nowrap">
                          {entry.shipmentNumber}
                        </td>
                        <td className="py-2 px-3 font-sans text-slate-700 max-w-xs truncate" title={entry.description}>
                          {entry.description}
                        </td>
                        <td className="py-2 px-2 text-left font-bold text-rose-700 whitespace-nowrap">
                          {entry.debit > 0 ? entry.debit.toLocaleString() : '-'}
                        </td>
                        <td className="py-2 px-2 text-left font-bold text-emerald-700 whitespace-nowrap">
                          {entry.credit > 0 ? entry.credit.toLocaleString() : '-'}
                        </td>
                        <td className="py-2 px-3 text-left font-black text-slate-900 whitespace-nowrap">
                          {entry.balance.toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 4️⃣ NET DUE IN WORDS & OFFICIAL NOTE */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-lg px-3.5 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
            <div>
              <span className="text-slate-400 font-normal">صافي الرصيد المستحق كتابةً: </span>
              <strong className="font-bold text-[#1A3668]">
                {netDue > 0 ? `${numberToArabicWords(netDue)} ريال يمني مستحقة على العميل لا غير` : 'خالص الذمة ولا توجد مبالغ مستحقة'}
              </strong>
            </div>
            <div className="text-[11px] text-slate-500 font-mono">
              معادلة الرصيد: رصيد البداية ({openingBalance.toLocaleString()}) + مدين ({totalDebit.toLocaleString()}) - دائن ({totalCredit.toLocaleString()}) = {netDue.toLocaleString()} ريال
            </div>
          </div>

          {/* 5️⃣ OFFICIAL SIGN-OFF & STAMP (Requirement 13) */}
          <div className="pt-4 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-4 items-center text-xs">
            {/* Status & Confirmation */}
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 block font-medium">حالة المستند المحاسبي:</span>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold text-xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>معتمد ومطابق دفترياً</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">كافة الحركات مقيدة محاسبياً في دفتر اليومية الآلي</p>
            </div>

            {/* Official Digital Seal */}
            <div className="flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 rounded-full border-2 border-dashed border-[#C5A059] bg-[#1A3668]/5 flex flex-col items-center justify-center p-1 text-center shadow-2xs">
                <span className="text-[9px] font-black text-[#1A3668]">TOP STORE</span>
                <span className="text-[8px] font-bold text-[#C5A059]">توب ستور</span>
                <span className="text-[7px] text-slate-500">معتمد رسمياً</span>
                <span className="text-[7px] font-mono text-emerald-700">✓ VERIFIED</span>
              </div>
              <span className="text-[10px] text-slate-400 mt-1">الختم المالي الرقمي</span>
            </div>

            {/* Officer Signature */}
            <div className="text-left space-y-1 sm:border-r sm:pr-4 border-slate-100">
              <span className="text-[10px] text-slate-400 block font-medium">المسؤول المالي والمحاسبي:</span>
              <strong className="text-slate-900 font-bold text-xs block">الإدارة المالية - توب ستور</strong>
              <div className="h-6 border-b border-slate-300 w-32 ml-auto mt-2" />
              <span className="text-[9px] text-slate-400 block">التوقيع والاعتماد</span>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center text-[10px] text-slate-400 pt-2 border-t border-slate-100 flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
            <span className="font-bold text-[#1A3668]">TOP STORE – توب ستور</span>
            <span>•</span>
            <span>كشف حساب مالي رسمي صادر من المنظومة المحاسبية</span>
            <span>•</span>
            <span className="font-mono">واتساب: {whatsapp}</span>
          </div>

        </div>
        )}

      </div>
    </div>
  );
};
