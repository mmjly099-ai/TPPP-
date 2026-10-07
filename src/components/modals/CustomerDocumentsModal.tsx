import React, { useState } from 'react';
import {
  X,
  FileText,
  Receipt,
  FileSpreadsheet,
  Printer,
  Share2,
  Eye,
  Check,
  Copy,
  ExternalLink,
  ShieldCheck,
  User,
  ShoppingBag,
  CreditCard,
  ArrowUpRight,
  TrendingDown,
  Clock
} from 'lucide-react';
import { Customer, Order, Payment } from '../../types';
import { useStore } from '../../context/StoreContext';

interface CustomerDocumentsModalProps {
  customer: Customer | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenOrderInvoice: (order: Order) => void;
  onOpenReceipt: (payment: Payment) => void;
  onViewStatement: (customer: Customer) => void;
  onOpenNewPayment: (customer: Customer, order?: Order) => void;
}

export const CustomerDocumentsModal: React.FC<CustomerDocumentsModalProps> = ({
  customer,
  isOpen,
  onClose,
  onOpenOrderInvoice,
  onOpenReceipt,
  onViewStatement,
  onOpenNewPayment
}) => {
  const { orders, payments, getCustomerBalance, settings } = useStore();
  const [activeTab, setActiveTab] = useState<'all' | 'invoices' | 'receipts' | 'statements'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!isOpen || !customer) return null;

  const currentDebt = getCustomerBalance(customer.id);
  const customerOrders = orders.filter(o => o.customerId === customer.id);
  const customerPayments = payments.filter(p => p.customerId === customer.id);

  const totalOrdersAmount = customerOrders
    .filter(o => o.status !== 'cancelled')
    .reduce((sum, o) => sum + (o.totalAmount || 0), 0);

  const totalPaidAmount = customerPayments
    .filter(p => p.status !== 'cancelled')
    .reduce((sum, p) => sum + p.amount, 0);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const cleanPhone = (customer.phone || '').replace(/[^0-9+]/g, '');

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto print:p-0 print:static print:bg-white" dir="rtl">
      <div className="bg-white rounded-2xl max-w-4xl w-full p-5 sm:p-6 shadow-2xl space-y-5 my-6 border border-slate-200">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1A3668] text-white flex items-center justify-center font-bold">
              <FileText className="w-5 h-5 text-[#C5A059]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-slate-900">
                  مستندات العميل: {customer.name}
                </h3>
                <span className="font-mono text-xs bg-amber-100 text-amber-900 px-2 py-0.5 rounded font-bold">
                  {customer.code}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                أرشيف الوثائق المالية المعتمدة: الفواتير، سندات القبض، وكشوفات الحساب
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Customer Balance & Snapshot Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
            <span className="text-[10px] text-slate-400 block font-medium">الرصيد الافتتاحي</span>
            <span className="text-sm font-bold font-mono text-slate-800 mt-0.5 block">
              {(customer.openingBalance || 0).toLocaleString()} ريال
            </span>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
            <span className="text-[10px] text-slate-400 block font-medium">إجمالي الفواتير (مدين)</span>
            <span className="text-sm font-bold font-mono text-[#1A3668] mt-0.5 block">
              {totalOrdersAmount.toLocaleString()} ريال
            </span>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
            <span className="text-[10px] text-slate-400 block font-medium">إجمالي المقبوض (دائن)</span>
            <span className="text-sm font-bold font-mono text-emerald-700 mt-0.5 block">
              {totalPaidAmount.toLocaleString()} ريال
            </span>
          </div>

          <div className={`p-3 rounded-xl border ${currentDebt > 0 ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
            <span className="text-[10px] text-slate-500 block font-medium">الرصيد الصافي المستحق</span>
            <span className={`text-base font-black font-mono mt-0.5 block ${currentDebt > 0 ? 'text-amber-900' : 'text-emerald-900'}`}>
              {currentDebt.toLocaleString()} ريال
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-2 flex-wrap gap-2">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl text-xs">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                activeTab === 'all' ? 'bg-white text-[#1A3668] shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              جميع المستندات ({customerOrders.length + customerPayments.length})
            </button>

            <button
              onClick={() => setActiveTab('invoices')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                activeTab === 'invoices' ? 'bg-white text-[#1A3668] shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              فواتير الطلبات ({customerOrders.length})
            </button>

            <button
              onClick={() => setActiveTab('receipts')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                activeTab === 'receipts' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              سندات القبض ({customerPayments.length})
            </button>

            <button
              onClick={() => setActiveTab('statements')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                activeTab === 'statements' ? 'bg-white text-blue-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              كشوف الحساب
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onViewStatement(customer)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1A3668] hover:bg-[#152c54] text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-[#C5A059]" />
              <span>فتح كشف الحساب التفصيلي (9 أعمدة)</span>
            </button>

            {currentDebt > 0 && (
              <button
                onClick={() => onOpenNewPayment(customer)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>تسجيل سند قبض</span>
              </button>
            )}
          </div>
        </div>

        {/* Content Section */}
        <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-1">
          
          {/* Section 1: Invoices */}
          {(activeTab === 'all' || activeTab === 'invoices') && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-800 border-b border-slate-100 pb-1">
                <span className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-[#1A3668]" />
                  <span>فواتير الطلبات</span>
                </span>
                <span className="text-slate-400 font-mono text-[11px]">{customerOrders.length} فاتورة</span>
              </div>

              {customerOrders.length === 0 ? (
                <div className="text-center py-4 text-xs text-slate-400 bg-slate-50 rounded-xl">
                  لا توجد طلبات مسجلة لهذا العميل حتى الآن
                </div>
              ) : (
                <div className="space-y-2">
                  {customerOrders.map(order => {
                    const isFullyPaid = (order.remainingAmount || 0) === 0;
                    const invoiceNum = order.invoiceNumber || `INV-${order.orderNumber}`;
                    return (
                      <div
                        key={order.id}
                        className="bg-white border border-slate-200/90 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-300 transition-colors"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <strong className="text-xs text-[#1A3668] font-bold font-mono">
                              {invoiceNum}
                            </strong>
                            <span className="text-slate-300">•</span>
                            <span className="text-xs font-semibold text-slate-800">
                              طلب #{order.orderNumber} ({order.site})
                            </span>
                            {order.shipmentNumber && (
                              <span className="text-[10px] font-mono bg-blue-50 text-blue-800 px-1.5 py-0.2 rounded font-bold">
                                شحنة #{order.shipmentNumber}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-3">
                            <span>التاريخ: {order.orderDate}</span>
                            <span>عدد القطع: {order.itemCount}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-t-0 pt-2 sm:pt-0">
                          <div className="text-left font-mono">
                            <div className="text-xs font-black text-slate-900">
                              {order.totalAmount.toLocaleString()} ريال
                            </div>
                            <div className="text-[10px]">
                              {isFullyPaid ? (
                                <span className="text-emerald-700 font-bold">مسدد بالكامل</span>
                              ) : (
                                <span className="text-amber-800 font-bold">
                                  متبقي: {order.remainingAmount.toLocaleString()} ريال
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => onOpenOrderInvoice(order)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-[#1A3668] hover:text-white text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                              title="عرض وطباعة الفاتورة"
                            >
                              <Eye className="w-3 h-3" />
                              <span>عرض</span>
                            </button>

                            {order.remainingAmount > 0 && (
                              <button
                                onClick={() => onOpenNewPayment(customer, order)}
                                className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-800 text-xs font-bold transition-colors cursor-pointer"
                                title="قبض دفعة"
                              >
                                <Receipt className="w-3 h-3" />
                                <span>قبض</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Section 2: Receipts */}
          {(activeTab === 'all' || activeTab === 'receipts') && (
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-800 border-b border-slate-100 pb-1">
                <span className="flex items-center gap-1.5">
                  <Receipt className="w-3.5 h-3.5 text-emerald-600" />
                  <span>سندات القبض المعتمدة</span>
                </span>
                <span className="text-slate-400 font-mono text-[11px]">{customerPayments.length} سند</span>
              </div>

              {customerPayments.length === 0 ? (
                <div className="text-center py-4 text-xs text-slate-400 bg-slate-50 rounded-xl">
                  لا توجد سندات قبض مسجلة لهذا العميل حتى الآن
                </div>
              ) : (
                <div className="space-y-2">
                  {customerPayments.map(payment => {
                    const rctNum = payment.receiptNumber || payment.paymentNumber.replace('PAY-', 'RCT-');
                    const isCancelled = payment.status === 'cancelled';
                    return (
                      <div
                        key={payment.id}
                        className="bg-white border border-slate-200/90 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-300 transition-colors"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <strong className="text-xs text-emerald-800 font-bold font-mono">
                              {rctNum}
                            </strong>
                            <span className="text-slate-300">•</span>
                            <span className="text-xs text-slate-700 font-medium">
                              {payment.statement || 'سداد دفعة على الحساب'}
                            </span>
                            {isCancelled && (
                              <span className="text-[10px] bg-rose-100 text-rose-800 px-1.5 py-0.2 rounded font-bold">
                                ملغى
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-3">
                            <span>التاريخ: {payment.paymentDate}</span>
                            <span>طريقة الدفع: {payment.paymentMethod}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-t-0 pt-2 sm:pt-0">
                          <div className="text-left font-mono">
                            <div className="text-xs font-black text-emerald-700">
                              {payment.amount.toLocaleString()} ريال
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {payment.paymentType || 'سداد'}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => onOpenReceipt(payment)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-800 text-xs font-bold transition-colors cursor-pointer border border-emerald-200"
                              title="عرض وطباعة سند القبض"
                            >
                              <Receipt className="w-3 h-3" />
                              <span>عرض السند</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Section 3: Statements Info */}
          {(activeTab === 'all' || activeTab === 'statements') && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-[#1A3668]" />
                  <span className="font-bold text-slate-900 text-xs">كشف الحساب المالي المعتمد</span>
                </div>
                <span className="text-[11px] text-emerald-700 font-bold">نموذج محاسبي رسمي (9 أعمدة)</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                يحتوي كشف الحساب على تفاصيل القيود المحاسبية بالترتيب الزمني مع خانات المدين، الدائن، الرصيد المتحرك، أرقام الفواتير وسندات القبض، والختم المعتمد، وجاهز للطباعة والمشاركة عبر واتساب كتقرير رسمي.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => onViewStatement(customer)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#1A3668] hover:bg-[#152c54] text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
                >
                  <Eye className="w-3.5 h-3.5 text-[#C5A059]" />
                  <span>معاينة وطباعة كشف الحساب الآن</span>
                </button>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
