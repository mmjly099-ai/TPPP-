import React, { useState, useMemo } from 'react';
import {
  FileText,
  Receipt,
  Search,
  Plus,
  Printer,
  FileDown,
  Share2,
  Copy,
  Check,
  Filter,
  Eye,
  Edit,
  Trash2,
  RotateCcw,
  Sparkles,
  ArrowUpDown,
  Calendar,
  Layers,
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
  ExternalLink,
  MessageCircle,
  Image as ImageIcon
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { Order, Payment, Customer, DocumentType, DocumentRecord, OtherReceivable, Expense, PurchaseBatch } from '../types';
import { TopStoreDocumentCard } from './documents/TopStoreDocumentCard';
import { NewDocumentWizardModal } from './modals/NewDocumentWizardModal';
import { DocumentImpactDeleteModal } from './modals/DocumentImpactDeleteModal';

export const InvoicesView: React.FC = () => {
  const {
    customers,
    orders,
    payments,
    accounts,
    expenses,
    purchaseBatches,
    otherReceivables,
    auditLogs,
    getCustomerBalance,
    addCustomer,
    addOrder,
    recordPayment,
    cancelPayment
  } = useStore();

  // Mode: 'document' (Single visual card matching screenshots) or 'table' (Document Registry)
  const [viewMode, setViewMode] = useState<'document' | 'table'>('document');

  // Selected document type for the visual card
  const [selectedDocType, setSelectedDocType] = useState<DocumentType>('receipt');

  // Selected specific item id (can be orderId or paymentId or customerId)
  const [selectedItemId, setSelectedItemId] = useState<string>('default');

  // Filter & Search states for the table registry
  const [searchQuery, setSearchQuery] = useState('');
  const [tableTypeFilter, setTableTypeFilter] = useState<string>('all');
  const [tableStatusFilter, setTableStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('');

  // Modals
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [cancelModalDoc, setCancelModalDoc] = useState<DocumentRecord | null>(null);

  // Copy feedback state
  const [copiedDocId, setCopiedDocId] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // -------------------------------------------------------------
  // 1. Compile Comprehensive Document Records from Real Database
  // -------------------------------------------------------------
  const allDocuments: DocumentRecord[] = useMemo(() => {
    const list: DocumentRecord[] = [];

    // A. Orders as Invoices (فاتورة طلب)
    orders.forEach(o => {
      const cust = customers.find(c => c.id === o.customerId);
      list.push({
        id: `inv-${o.id}`,
        documentType: 'order_invoice',
        documentTypeLabel: 'فاتورة طلب',
        documentNumber: o.invoiceNumber || `INV-${870000 + o.id}`,
        customerId: o.customerId,
        customerName: cust?.name || 'عميل غير مسجل',
        customerCode: cust?.code || `TOP-${String(o.customerId).padStart(3, '0')}`,
        customerPhone: cust?.phone,
        customerGovernorate: cust?.governorate || 'مأرب',
        orderId: o.id,
        orderNumber: o.orderNumber || o.id,
        customerOrderNumber: o.customerOrderNumber || o.id,
        shipmentNumber: o.trackingNumber,
        date: o.orderDate || new Date().toISOString().split('T')[0],
        amount: o.totalAmount || 0,
        paidAmount: o.paidAmount || 0,
        remainingAmount: o.remainingAmount || 0,
        discount: o.discount || 0,
        deliveryFee: o.deliveryFee || 0,
        status: o.status === 'cancelled' ? 'cancelled' : 'approved',
        paymentMethod: o.paymentMethod || 'تحويل',
        notes: o.notes,
        createdAt: o.createdAt || new Date().toISOString()
      });
    });

    // B. Payments as Receipts (سند قبض)
    payments.forEach(p => {
      const cust = customers.find(c => c.id === p.customerId);
      const ord = orders.find(o => o.id === p.orderId);
      const acc = accounts.find(a => a.id === p.accountId);
      list.push({
        id: `pay-${p.id}`,
        documentType: 'receipt',
        documentTypeLabel: 'سند قبض',
        documentNumber: p.receiptNumber || p.paymentNumber || `PAY-${p.id}`,
        customerId: p.customerId,
        customerName: cust?.name || 'عميل',
        customerCode: cust?.code || `TOP-${String(p.customerId).padStart(3, '0')}`,
        customerPhone: cust?.phone,
        customerGovernorate: cust?.governorate || 'مأرب',
        orderId: p.orderId,
        orderNumber: ord?.orderNumber || p.orderId,
        customerOrderNumber: ord?.customerOrderNumber || ord?.id || '—',
        shipmentNumber: ord?.trackingNumber,
        date: p.paymentDate || new Date().toISOString().split('T')[0],
        amount: p.amount,
        paidAmount: p.amount,
        remainingAmount: ord ? ord.remainingAmount : 0,
        status: p.status === 'cancelled' ? 'cancelled' : 'approved',
        paymentMethod: p.paymentMethod,
        accountName: acc?.name || 'أم فلوس',
        notes: p.notes,
        createdAt: p.createdAt || new Date().toISOString()
      });
    });

    // C. Customers with orders as Consolidated Invoices (فاتورة موحدة)
    customers.forEach(c => {
      const cOrders = orders.filter(o => o.customerId === c.id);
      if (cOrders.length > 0) {
        const total = cOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
        const paid = cOrders.reduce((sum, o) => sum + (o.paidAmount || 0), 0);
        const remaining = cOrders.reduce((sum, o) => sum + (o.remainingAmount || 0), 0);
        list.push({
          id: `cust-inv-${c.id}`,
          documentType: 'consolidated_invoice',
          documentTypeLabel: 'فاتورة موحدة للعميل',
          documentNumber: `INV-${1050000 + c.id}`,
          customerId: c.id,
          customerName: c.name,
          customerCode: c.code,
          customerPhone: c.phone,
          customerGovernorate: c.governorate || 'مأرب',
          date: new Date().toISOString().split('T')[0],
          amount: total,
          paidAmount: paid,
          remainingAmount: remaining,
          status: 'approved',
          createdAt: c.createdAt || new Date().toISOString()
        });

        // D. Customer Statement (كشف حساب العميل)
        list.push({
          id: `cust-stat-${c.id}`,
          documentType: 'customer_statement',
          documentTypeLabel: 'كشف حساب العميل',
          documentNumber: `STAT-${1050000 + c.id}`,
          customerId: c.id,
          customerName: c.name,
          customerCode: c.code,
          customerPhone: c.phone,
          customerGovernorate: c.governorate || 'مأرب',
          date: new Date().toISOString().split('T')[0],
          amount: total,
          paidAmount: paid,
          remainingAmount: remaining,
          status: 'approved',
          createdAt: c.createdAt || new Date().toISOString()
        });
      }
    });

    // E. Other Receivables (بيان ذمة مالية)
    otherReceivables.forEach(r => {
      list.push({
        id: `rec-${r.id}`,
        documentType: 'receivable_statement',
        documentTypeLabel: 'بيان ذمة مالية',
        documentNumber: `REC-${100000 + r.id}`,
        customerName: r.name,
        customerPhone: r.phone,
        date: r.date || new Date().toISOString().split('T')[0],
        amount: Number(r.amount) || 0,
        paidAmount: Number(r.settledAmount) || 0,
        remainingAmount: (Number(r.amount) || 0) - (Number(r.settledAmount) || 0),
        status: r.status === 'settled' ? 'approved' : 'draft',
        notes: r.reason,
        createdAt: r.date || new Date().toISOString()
      });
    });

    // F. Expenses (سند صرف)
    expenses.forEach(e => {
      const acc = accounts.find(a => a.id === e.accountId);
      list.push({
        id: `exp-${e.id}`,
        documentType: 'expense_voucher',
        documentTypeLabel: 'سند صرف',
        documentNumber: e.expenseNumber || `EXP-${100000 + e.id}`,
        customerName: e.vendorName || e.category,
        date: (e as any).date || new Date().toISOString().split('T')[0],
        amount: Number(e.amount) || 0,
        paidAmount: Number(e.amount) || 0,
        remainingAmount: 0,
        status: e.status === 'cancelled' ? 'cancelled' : 'approved',
        paymentMethod: e.paymentMethod,
        accountName: acc?.name,
        notes: e.description,
        createdAt: new Date().toISOString()
      });
    });

    // G. Purchase Batches (مستندات مشتريات)
    purchaseBatches.forEach(b => {
      list.push({
        id: `batch-${b.id}`,
        documentType: 'purchase_document',
        documentTypeLabel: 'مستند مشتريات',
        documentNumber: `PO-${100000 + b.id}`,
        customerName: `دفعة ${b.platform}`,
        date: b.batchDate || new Date().toISOString().split('T')[0],
        amount: b.totalCostYen || 0,
        paidAmount: b.totalCostYen || 0,
        remainingAmount: 0,
        status: 'approved',
        createdAt: b.batchDate || new Date().toISOString()
      });
    });

    return list;
  }, [orders, payments, customers, accounts, expenses, purchaseBatches, otherReceivables]);

  // -------------------------------------------------------------
  // 2. Fallback Demo Seed (if database is empty to match screenshots)
  // -------------------------------------------------------------
  const handleSeedDemoData = () => {
    // Check if customer exists
    let demoCust = customers.find(c => c.phone === '736974902' || c.code === 'TOP 037');
    if (!demoCust) {
      demoCust = addCustomer({
        name: 'امال عامر احمد العمري',
        code: 'TOP 037',
        phone: '736974902',
        governorate: 'مأرب',
        address: 'مأرب ـ المدينة'
      });
    }

    // Add Order if not exists
    const existingOrders = orders.filter(o => o.customerId === demoCust?.id);
    if (existingOrders.length === 0 && demoCust) {
      const newOrder = addOrder(
        {
          customerId: demoCust.id,
          orderNumber: 'ORD-870001',
          customerOrderNumber: '1',
          purchaseSite: 'SHEIN',
          itemsCount: 1,
          orderPrice: 8300,
          discount: 0,
          deliveryFee: 0,
          deliveryFeeCollectionStatus: 'unpaid',
          status: 'pending',
          orderDate: '2026/9/18',
          invoiceNumber: 'INV-870001',
          invoiceStatus: 'approved'
        },
        {
          amount: 4300,
          accountId: accounts[0]?.id || 1,
          paymentMethod: 'تحويل'
        }
      );
    }
  };

  // -------------------------------------------------------------
  // 3. Selection for Document Card View
  // -------------------------------------------------------------
  // Filter available options for the second dropdown based on selectedDocType
  const availableItemsForType = useMemo(() => {
    switch (selectedDocType) {
      case 'receipt':
        return payments.map(p => {
          const cust = customers.find(c => c.id === p.customerId);
          return {
            id: String(p.id),
            label: `${p.receiptNumber || p.paymentNumber || `PAY-${p.id}`} — ${cust?.name || 'عميل'}`
          };
        });
      case 'order_invoice':
        return orders.map(o => {
          const cust = customers.find(c => c.id === o.customerId);
          return {
            id: String(o.id),
            label: `${o.invoiceNumber || `INV-${870000 + o.id}`} — ${cust?.name || 'عميل'}`
          };
        });
      case 'consolidated_invoice':
      case 'customer_statement':
        return customers.map(c => ({
          id: String(c.id),
          label: `${c.code} — ${c.name}`
        }));
      case 'receivable_statement':
        return otherReceivables.map(r => ({
          id: String(r.id),
          label: `REC-${r.id} — ${r.name}`
        }));
      case 'expense_voucher':
        return expenses.map(e => ({
          id: String(e.id),
          label: `${e.expenseNumber || `EXP-${e.id}`} — ${e.vendorName || e.category}`
        }));
      case 'purchase_document':
        return purchaseBatches.map(b => ({
          id: String(b.id),
          label: `BATCH-${b.id} — ${b.platform}`
        }));
      default:
        return [];
    }
  }, [selectedDocType, payments, orders, customers, otherReceivables, expenses, purchaseBatches]);

  // Active document data resolution
  const activeDocData = useMemo(() => {
    // 1. Try finding actual linked item
    if (selectedDocType === 'receipt') {
      const p = payments.find(item => String(item.id) === selectedItemId) || payments[0];
      const ord = p ? orders.find(o => o.id === p.orderId) : orders[0];
      const cust = p ? customers.find(c => c.id === p.customerId) : (ord ? customers.find(c => c.id === ord.customerId) : customers[0]);
      const acc = p ? accounts.find(a => a.id === p.accountId) : accounts[0];

      return {
        docNumber: p ? (p.receiptNumber || p.paymentNumber || `PAY-${p.id}`) : 'PAY-50409065-8',
        date: p ? p.paymentDate : '2026/9/25',
        customer: cust || { id: 1, name: 'امال عامر احمد العمري', code: 'TOP 037', phone: '736974902', governorate: 'مأرب', address: 'مأرب' },
        order: ord || {
          id: 1,
          customerId: 1,
          orderNumber: 'ORD-001',
          customerOrderNumber: '1',
          totalAmount: 8300,
          paidAmount: 4300,
          remainingAmount: 4000,
          discount: 0,
          deliveryFee: 0,
          deliveryFeeCollectionStatus: 'unpaid',
          status: 'pending',
          orderDate: '2026/9/18',
          createdAt: new Date().toISOString()
        },
        payment: p || {
          id: 1,
          paymentNumber: 'PAY-50409065-8',
          receiptNumber: 'PAY-50409065-8',
          customerId: 1,
          accountId: 1,
          amount: 4300,
          paymentDate: '2026/9/25',
          paymentMethod: 'تحويل',
          paymentType: 'first',
          createdAt: new Date().toISOString()
        },
        accountName: acc?.name || 'أم فلوس'
      };
    }

    if (selectedDocType === 'order_invoice') {
      const ord = orders.find(item => String(item.id) === selectedItemId) || orders[0];
      const cust = ord ? customers.find(c => c.id === ord.customerId) : customers[0];
      const p = ord ? payments.find(pay => pay.orderId === ord.id) : payments[0];
      const acc = p ? accounts.find(a => a.id === p.accountId) : accounts[0];

      return {
        docNumber: ord ? (ord.invoiceNumber || `INV-${870000 + ord.id}`) : 'INV-870001',
        date: ord ? ord.orderDate : '2026/9/25',
        customer: cust || { id: 1, name: 'امال عامر احمد العمري', code: 'TOP 037', phone: '736974902', governorate: 'مأرب', address: 'مأرب' },
        order: ord || {
          id: 1,
          customerId: 1,
          orderNumber: 'ORD-001',
          customerOrderNumber: '1',
          totalAmount: 8300,
          paidAmount: 4300,
          remainingAmount: 4000,
          discount: 0,
          deliveryFee: 0,
          deliveryFeeCollectionStatus: 'unpaid',
          status: 'pending',
          orderDate: '2026/9/18',
          createdAt: new Date().toISOString()
        },
        payment: p || {
          id: 1,
          paymentNumber: 'PAY-50409065-8',
          receiptNumber: 'PAY-50409065-8',
          customerId: 1,
          accountId: 1,
          amount: 4300,
          paymentDate: '2026/9/17',
          paymentMethod: 'تحويل',
          paymentType: 'first',
          createdAt: new Date().toISOString()
        },
        accountName: acc?.name || 'أم فلوس'
      };
    }

    if (selectedDocType === 'consolidated_invoice' || selectedDocType === 'customer_statement') {
      const cust = customers.find(c => String(c.id) === selectedItemId) || customers[0] || {
        id: 1,
        name: 'امال عامر احمد العمري',
        code: 'TOP 037',
        phone: '736974902',
        governorate: 'مأرب',
        address: 'مأرب'
      };
      const custOrders = orders.filter(o => o.customerId === cust?.id);
      const custPayments = payments.filter(p => p.customerId === cust?.id);

      return {
        docNumber: selectedDocType === 'consolidated_invoice' ? `INV-${1050000 + cust.id}` : `STAT-${1050000 + cust.id}`,
        date: '2026/9/25',
        customer: cust,
        customerOrders: custOrders,
        customerPayments: custPayments,
        order: custOrders[0] || null
      };
    }

    if (selectedDocType === 'receivable_statement') {
      const rec = otherReceivables.find(r => String(r.id) === selectedItemId) || otherReceivables[0];
      return {
        docNumber: rec ? `REC-${100000 + rec.id}` : 'REC-100001',
        date: rec ? rec.date : '2026/9/25',
        receivable: rec || { id: 1, name: 'أحمد علي', phone: '777000111', reason: 'ذمة شحن', amount: '5000', settledAmount: '2000', status: 'partial', date: '2026/9/20' }
      };
    }

    if (selectedDocType === 'expense_voucher') {
      const exp = expenses.find(e => String(e.id) === selectedItemId) || expenses[0];
      const acc = exp ? accounts.find(a => a.id === exp.accountId) : accounts[0];
      return {
        docNumber: exp ? (exp.expenseNumber || `EXP-${100000 + exp.id}`) : 'EXP-100001',
        date: '2026/9/25',
        expense: exp || { id: 1, expenseNumber: 'EXP-100001', category: 'مصاريف تشغيل', vendorName: 'شركة النقل', amount: 3500, paymentMethod: 'نقداً', accountId: 1, description: 'أجور توصيل طلبات', status: 'active' },
        accountName: acc?.name || 'الصندوق'
      };
    }

    if (selectedDocType === 'purchase_document') {
      const batch = purchaseBatches.find(b => String(b.id) === selectedItemId) || purchaseBatches[0];
      return {
        docNumber: batch ? `PO-${100000 + batch.id}` : 'PO-100001',
        date: batch ? batch.batchDate : '2026/9/25',
        purchaseBatch: batch || { id: 1, platform: 'SHEIN', ordersCount: 4, foreignAmount: '120.50', foreignCurrency: '$', totalCostYen: 65000, batchDate: '2026/9/24', cardName: 'فيزا كارد بنك التضامن' }
      };
    }

    return {
      docNumber: 'INV-870001',
      date: '2026/9/25',
      customer: customers[0] || null,
      order: orders[0] || null
    };
  }, [selectedDocType, selectedItemId, payments, orders, customers, accounts, expenses, otherReceivables, purchaseBatches]);

  // -------------------------------------------------------------
  // 4. Action Handlers (Print, PDF, Share, Copy)
  // -------------------------------------------------------------
  const handlePrint = () => {
    window.print();
  };

  const handleCopyDocNumber = (numberToCopy: string) => {
    navigator.clipboard.writeText(numberToCopy);
    setCopiedDocId(numberToCopy);
    setTimeout(() => setCopiedDocId(null), 2000);
  };

  const handleShareLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleShareWhatsApp = () => {
    const text = `مستند مالي رسمي من TOP STORE — رقم المستند: ${activeDocData.docNumber}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  // Safe Cancel / Delete
  const handleConfirmCancelDocument = (doc: DocumentRecord, reason: string) => {
    if (doc.documentType === 'receipt' && doc.orderId) {
      // Find payment
      const p = payments.find(pay => pay.receiptNumber === doc.documentNumber || pay.id === Number(doc.id.replace('pay-', '')));
      if (p) {
        cancelPayment(p.id, reason);
      }
    }
  };

  // -------------------------------------------------------------
  // 5. Filtered Table Documents
  // -------------------------------------------------------------
  const filteredTableDocs = useMemo(() => {
    return allDocuments.filter(doc => {
      // Type filter
      if (tableTypeFilter !== 'all' && doc.documentType !== tableTypeFilter) {
        return false;
      }
      // Status filter
      if (tableStatusFilter !== 'all' && doc.status !== tableStatusFilter) {
        return false;
      }
      // Date filter
      if (dateFilter && !doc.date.includes(dateFilter)) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const match =
          doc.documentNumber.toLowerCase().includes(q) ||
          (doc.customerName && doc.customerName.toLowerCase().includes(q)) ||
          (doc.customerCode && doc.customerCode.toLowerCase().includes(q)) ||
          (doc.customerPhone && doc.customerPhone.includes(q)) ||
          (doc.orderNumber && String(doc.orderNumber).includes(q)) ||
          (doc.shipmentNumber && doc.shipmentNumber.toLowerCase().includes(q));
        if (!match) return false;
      }
      return true;
    });
  }, [allDocuments, tableTypeFilter, tableStatusFilter, dateFilter, searchQuery]);

  return (
    <div className="space-y-5 font-sans" dir="rtl">
      {/* ======================================================== */}
      {/* 1. TOP HEADER & NAVIGATION BAR                            */}
      {/* ======================================================== */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <span className="text-xs font-bold text-slate-400 block mb-0.5">مركز المستندات</span>
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              الفواتير والمستندات
            </h1>
            <span className="bg-amber-100/70 text-amber-900 text-[11px] font-black px-2.5 py-0.5 rounded-full border border-amber-300/60 hidden sm:inline-block">
              TOP STORE
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            مستندات رسمية تعتمد على بيانات العملاء والطلبات والدفعات الأصلية دون تكرار.
          </p>
        </div>

        {/* View mode toggle & New document button */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Mode Switcher */}
          <div className="bg-slate-100 p-1 rounded-2xl flex items-center border border-slate-200 text-xs font-bold">
            <button
              onClick={() => setViewMode('document')}
              className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                viewMode === 'document'
                  ? 'bg-white text-[#1A3668] shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>معاينة المستند</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                viewMode === 'table'
                  ? 'bg-white text-[#1A3668] shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>سجل المستندات ({allDocuments.length})</span>
            </button>
          </div>

          {/* New Document Button */}
          <button
            onClick={() => setIsWizardOpen(true)}
            className="px-4 py-2 bg-[#1A3668] hover:bg-[#112952] text-white rounded-2xl text-xs font-black shadow-md flex items-center gap-1.5 transition-all"
          >
            <Plus className="w-4 h-4 text-[#C5A059]" />
            <span>إنشاء مستند جديد</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. DOCUMENT VIEW MODE (MATCHING SCREENSHOTS)             */}
      {/* ======================================================== */}
      {viewMode === 'document' && (
        <div className="space-y-4">
          {/* Top Control Bar with 2 Dropdowns & Action Buttons (Screenshot Style) */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs print:hidden">
            {/* Right: Dropdowns */}
            <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full lg:w-auto">
              {/* Dropdown 1: نوع المستند */}
              <div className="w-full sm:w-56">
                <select
                  value={selectedDocType}
                  onChange={e => {
                    setSelectedDocType(e.target.value as DocumentType);
                    setSelectedItemId('default');
                  }}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-[#1A3668] focus:outline-none"
                >
                  <option value="receipt">سند قبض</option>
                  <option value="order_invoice">فاتورة طلب</option>
                  <option value="consolidated_invoice">فاتورة موحدة للعميل</option>
                  <option value="customer_statement">كشف حساب العميل</option>
                  <option value="receivable_statement">بيان ذمة مالية</option>
                  <option value="expense_voucher">سند صرف</option>
                  <option value="purchase_document">مستندات المشتريات</option>
                </select>
              </div>

              {/* Dropdown 2: اختيار المستند / العميل */}
              <div className="w-full sm:w-80">
                <select
                  value={selectedItemId}
                  onChange={e => setSelectedItemId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-[#1A3668] focus:outline-none"
                >
                  {availableItemsForType.length > 0 ? (
                    availableItemsForType.map(item => (
                      <option key={item.id} value={item.id}>
                        {item.label}
                      </option>
                    ))
                  ) : (
                    <option value="default">
                      {selectedDocType === 'receipt'
                        ? 'PAY-50409065-8 — امال عامر احمد العمري'
                        : selectedDocType === 'order_invoice'
                        ? 'INV-870001 — امال عامر احمد العمري'
                        : 'TOP 037 — امال عامر احمد العمري'}
                    </option>
                  )}
                </select>
              </div>
            </div>

            {/* Left: Action Buttons (طباعة، إنشاء PDF، صورة، مشاركة) */}
            <div className="flex items-center gap-1.5 justify-end w-full lg:w-auto">
              <button
                onClick={handlePrint}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                title="طباعة على ورق A4"
              >
                <Printer className="w-3.5 h-3.5 text-slate-600" />
                <span>طباعة</span>
              </button>

              <button
                onClick={handlePrint}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                title="إنشاء وحفظ ملف PDF"
              >
                <FileDown className="w-3.5 h-3.5 text-[#1A3668]" />
                <span>إنشاء PDF</span>
              </button>

              <button
                onClick={handlePrint}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                title="تصدير صورة"
              >
                <ImageIcon className="w-3.5 h-3.5 text-slate-600" />
                <span>صورة</span>
              </button>

              <button
                onClick={handleShareWhatsApp}
                className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                title="مشاركة عبر واتساب"
              >
                <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                <span>واتساب</span>
              </button>

              <button
                onClick={handleShareLink}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                title="نسخ رابط أو رقم المستند"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5 text-slate-600" />}
                <span>{copiedLink ? 'تم النسخ!' : 'مشاركة'}</span>
              </button>
            </div>
          </div>

          {/* Prompt if no orders exist in DB to seed the sample view */}
          {allDocuments.length === 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-amber-900 font-bold">
                <Sparkles className="w-4 h-4 text-[#C5A059]" />
                <span>لم تقم بإدخال طلبات بعد. يمكنك إنشاء طلب جديد الآن أو تحميل نموذج العرض للمعاينة:</span>
              </div>
              <button
                onClick={handleSeedDemoData}
                className="px-3.5 py-1.5 bg-[#1A3668] text-white font-bold rounded-xl hover:bg-[#112952] shrink-0"
              >
                تحميل بيانات تجريبية (توب ستور)
              </button>
            </div>
          )}

          {/* The Pristine Document Card Component */}
          <div className="pt-2 pb-6">
            <TopStoreDocumentCard
              documentType={selectedDocType}
              docNumber={activeDocData.docNumber}
              date={activeDocData.date}
              customer={activeDocData.customer}
              order={activeDocData.order}
              payment={activeDocData.payment}
              expense={(activeDocData as any).expense}
              receivable={(activeDocData as any).receivable}
              purchaseBatch={(activeDocData as any).purchaseBatch}
              customerOrders={(activeDocData as any).customerOrders || []}
              customerPayments={(activeDocData as any).customerPayments || []}
              accountName={activeDocData.accountName}
            />
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. TABLE REGISTRY VIEW (سجل المستندات الشامل)             */}
      {/* ======================================================== */}
      {viewMode === 'table' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                <input
                  type="text"
                  placeholder="بحث برقم المستند، العميل، الطلب، الشحنة..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pr-9 pl-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#1A3668] focus:outline-none"
                />
              </div>

              {/* Type Filter */}
              <div>
                <select
                  value={tableTypeFilter}
                  onChange={e => setTableTypeFilter(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-bold"
                >
                  <option value="all">كافة أنواع المستندات</option>
                  <option value="order_invoice">فاتورة طلب</option>
                  <option value="receipt">سند قبض</option>
                  <option value="consolidated_invoice">فاتورة موحدة</option>
                  <option value="customer_statement">كشف حساب</option>
                  <option value="receivable_statement">بيان ذمة مالية</option>
                  <option value="expense_voucher">سند صرف</option>
                  <option value="purchase_document">مستند مشتريات</option>
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <select
                  value={tableStatusFilter}
                  onChange={e => setTableStatusFilter(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-bold"
                >
                  <option value="all">كافة الحالات</option>
                  <option value="approved">معتمد</option>
                  <option value="draft">مسودة</option>
                  <option value="cancelled">ملغى</option>
                </select>
              </div>

              {/* Date Filter */}
              <div>
                <input
                  type="date"
                  value={dateFilter}
                  onChange={e => setDateFilter(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-[#1A3668] text-white text-[11px] font-black">
                  <tr>
                    <th className="p-3 px-4">رقم المستند</th>
                    <th className="p-3">نوع المستند</th>
                    <th className="p-3">العميل / الطرف المعني</th>
                    <th className="p-3">رقم العميل</th>
                    <th className="p-3">رقم الطلب</th>
                    <th className="p-3">رقم الشحنة</th>
                    <th className="p-3">التاريخ</th>
                    <th className="p-3">الإجمالي</th>
                    <th className="p-3">المدفوع</th>
                    <th className="p-3">المتبقي</th>
                    <th className="p-3">الحالة</th>
                    <th className="p-3 px-4 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTableDocs.length > 0 ? (
                    filteredTableDocs.map(doc => {
                      const isCancelled = doc.status === 'cancelled';
                      return (
                        <tr
                          key={doc.id}
                          className={`hover:bg-slate-50/80 transition-colors ${
                            isCancelled ? 'bg-rose-50/20 opacity-70' : ''
                          }`}
                        >
                          {/* رقم المستند */}
                          <td className="p-3 px-4 font-mono font-black text-[#1A3668]">
                            <button
                              onClick={() => {
                                setSelectedDocType(doc.documentType);
                                if (doc.orderId) setSelectedItemId(String(doc.orderId));
                                else if (doc.customerId) setSelectedItemId(String(doc.customerId));
                                setViewMode('document');
                              }}
                              className="hover:underline flex items-center gap-1.5"
                            >
                              <span>{doc.documentNumber}</span>
                            </button>
                          </td>

                          {/* نوع المستند */}
                          <td className="p-3 font-bold text-slate-700">
                            <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded-md text-[11px] border border-slate-200">
                              {doc.documentTypeLabel}
                            </span>
                          </td>

                          {/* العميل */}
                          <td className="p-3 font-bold text-slate-900 truncate max-w-[150px]">
                            {doc.customerName || '—'}
                          </td>

                          {/* رقم العميل */}
                          <td className="p-3 font-mono font-bold text-slate-600">
                            {doc.customerCode || '—'}
                          </td>

                          {/* رقم الطلب */}
                          <td className="p-3 font-mono text-slate-700">
                            {doc.customerOrderNumber || doc.orderNumber || '—'}
                          </td>

                          {/* رقم الشحنة */}
                          <td className="p-3 font-mono text-slate-500">
                            {doc.shipmentNumber || '—'}
                          </td>

                          {/* التاريخ */}
                          <td className="p-3 font-mono text-slate-600 whitespace-nowrap">
                            {doc.date}
                          </td>

                          {/* الإجمالي */}
                          <td className="p-3 font-mono font-bold text-slate-900">
                            {doc.amount.toLocaleString()} ريال
                          </td>

                          {/* المدفوع */}
                          <td className="p-3 font-mono font-bold text-emerald-700">
                            {doc.paidAmount.toLocaleString()} ريال
                          </td>

                          {/* المتبقي */}
                          <td className="p-3 font-mono font-bold text-rose-700">
                            {doc.remainingAmount.toLocaleString()} ريال
                          </td>

                          {/* الحالة */}
                          <td className="p-3">
                            {doc.status === 'approved' && (
                              <span className="bg-emerald-50 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full border border-emerald-200">
                                معتمد
                              </span>
                            )}
                            {doc.status === 'draft' && (
                              <span className="bg-amber-50 text-amber-800 text-[10px] font-black px-2 py-0.5 rounded-full border border-amber-200">
                                مسودة
                              </span>
                            )}
                            {doc.status === 'cancelled' && (
                              <span className="bg-rose-50 text-rose-800 text-[10px] font-black px-2 py-0.5 rounded-full border border-rose-200">
                                ملغى
                              </span>
                            )}
                          </td>

                          {/* الإجراءات */}
                          <td className="p-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {/* عرض */}
                              <button
                                onClick={() => {
                                  setSelectedDocType(doc.documentType);
                                  if (doc.orderId) setSelectedItemId(String(doc.orderId));
                                  else if (doc.customerId) setSelectedItemId(String(doc.customerId));
                                  setViewMode('document');
                                }}
                                className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-[#1A3668] hover:text-white text-slate-700 flex items-center justify-center transition-all"
                                title="عرض المستند"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>

                              {/* نسخ الرقم */}
                              <button
                                onClick={() => handleCopyDocNumber(doc.documentNumber)}
                                className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-all"
                                title="نسخ رقم المستند"
                              >
                                {copiedDocId === doc.documentNumber ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>

                              {/* طباعة */}
                              <button
                                onClick={() => {
                                  setSelectedDocType(doc.documentType);
                                  if (doc.orderId) setSelectedItemId(String(doc.orderId));
                                  else if (doc.customerId) setSelectedItemId(String(doc.customerId));
                                  setViewMode('document');
                                  setTimeout(() => window.print(), 300);
                                }}
                                className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-all"
                                title="طباعة"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>

                              {/* إلغاء / حذف آمن */}
                              {!isCancelled && (
                                <button
                                  onClick={() => setCancelModalDoc(doc)}
                                  className="w-7 h-7 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 flex items-center justify-center transition-all"
                                  title="إلغاء المستند مع فحص التأثير المالي"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={12} className="text-center py-10 text-xs text-slate-400">
                        لا توجد مستندات مطابقة للبحث أو الفلتر المختار.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. MODALS (Wizard & Impact Confirmation)                 */}
      {/* ======================================================== */}
      <NewDocumentWizardModal
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onDocumentCreated={(createdType) => {
          setSelectedDocType(createdType);
          setViewMode('document');
        }}
      />

      <DocumentImpactDeleteModal
        isOpen={!!cancelModalDoc}
        document={cancelModalDoc}
        onClose={() => setCancelModalDoc(null)}
        onConfirmCancel={handleConfirmCancelDocument}
      />
    </div>
  );
};
