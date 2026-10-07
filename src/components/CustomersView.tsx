import React, { useState } from 'react';
import {
  Users,
  Search,
  Plus,
  Phone,
  MapPin,
  FileText,
  Receipt,
  MessageCircle,
  ExternalLink,
  ChevronLeft,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { Customer, Order, Payment } from '../types';
import { CustomerDocumentsModal } from './modals/CustomerDocumentsModal';

interface CustomersViewProps {
  onOpenNewCustomer: () => void;
  onOpenPaymentForCustomer: (customer: Customer, order?: Order) => void;
  onViewCustomerStatement?: (customer: Customer) => void;
  onViewStatement?: (customer: Customer) => void;
  onOpenOrderInvoice?: (order: Order) => void;
  onOpenReceipt?: (payment: Payment) => void;
}

export const CustomersView: React.FC<CustomersViewProps> = ({
  onOpenNewCustomer,
  onOpenPaymentForCustomer,
  onViewCustomerStatement,
  onViewStatement,
  onOpenOrderInvoice,
  onOpenReceipt
}) => {
  const { customers, getCustomerBalance, totalCustomerDebts } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [govFilter, setGovFilter] = useState('ALL');
  const [selectedDocsCustomer, setSelectedDocsCustomer] = useState<Customer | null>(null);

  const handleStatementClick = (customer: Customer) => {
    if (onViewStatement) onViewStatement(customer);
    else if (onViewCustomerStatement) onViewCustomerStatement(customer);
  };

  // Extract unique governorates
  const governorates = Array.from(new Set(customers.map(c => c.governorate?.trim()).filter(Boolean)));

  const filteredCustomers = customers.filter(c => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm) ||
      (c.pickupLocation && c.pickupLocation.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesGov = govFilter === 'ALL' || c.governorate?.trim() === govFilter;

    return matchesSearch && matchesGov;
  });

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">سجل العملاء والذمم المالية</h2>
          <p className="text-xs text-slate-500">
            {customers.length} عميل مسجل في توب ستور عبر مختلف محافظات الجمهورية اليمنية
          </p>
        </div>

        <button
          onClick={onOpenNewCustomer}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة عميل جديد</span>
        </button>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-xs text-slate-500">إجمالي عدد العملاء</span>
          <div className="text-xl font-black font-mono text-slate-900 mt-1">
            {customers.length} <span className="text-xs text-slate-500 font-sans">عميل</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-xs text-slate-500">إجمالي المديونيات المستحقة</span>
          <div className="text-xl font-black font-mono text-amber-600 mt-1">
            {totalCustomerDebts.toLocaleString()} <span className="text-xs text-slate-500 font-sans">ريال</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-xs text-slate-500">المحافظات المغطاة</span>
          <div className="text-xl font-black font-mono text-blue-600 mt-1">
            {governorates.length} <span className="text-xs text-slate-500 font-sans">محافظة</span>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
          <input
            type="text"
            placeholder="بحث بالاسم، الكود (TOP 001)، رقم الهاتف، أو مكان الاستلام..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pr-9 pl-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:border-amber-500"
          />
        </div>

        <select
          value={govFilter}
          onChange={e => setGovFilter(e.target.value)}
          className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700"
        >
          <option value="ALL">جميع المحافظات</option>
          {governorates.map(gov => (
            <option key={gov} value={gov}>{gov}</option>
          ))}
        </select>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
              <tr>
                <th className="py-3 px-4">كود العميل</th>
                <th className="py-3 px-4">اسم العميل</th>
                <th className="py-3 px-4">الهاتف والتواصل</th>
                <th className="py-3 px-4">المحافظة ومكان الاستلام</th>
                <th className="py-3 px-4">الرصيد الافتتاحي</th>
                <th className="py-3 px-4">الرصيد الحالي (المستحق)</th>
                <th className="py-3 px-4 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCustomers.map(customer => {
                const balance = getCustomerBalance(customer.id);
                const hasDebt = balance > 0;
                const cleanPhone = customer.phone.replace(/[^0-9+]/g, '');

                return (
                  <tr key={customer.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      <span className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded-md font-semibold">
                        {customer.code}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-800 text-sm">{customer.name}</div>
                      {customer.notes && (
                        <span className="text-[10px] text-slate-400 block">{customer.notes}</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-slate-600" dir="ltr">{customer.phone}</span>
                        <a
                          href={`https://wa.me/${cleanPhone.startsWith('967') || cleanPhone.startsWith('+') ? cleanPhone : '967' + cleanPhone}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-emerald-600 hover:text-emerald-700 p-1 rounded-md hover:bg-emerald-50 transition-colors"
                          title="مراسلة واتساب"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-slate-700 block">{customer.governorate}</span>
                      {customer.pickupLocation ? (
                        <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          {customer.pickupLocation}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono">
                      {parseFloat(String(customer.openingBalance || 0)) > 0 ? (
                        <span className="font-semibold text-slate-700">
                          {parseFloat(String(customer.openingBalance)).toLocaleString()} ريال
                        </span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono">
                      {hasDebt ? (
                        <span className="font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded-md">
                          {balance.toLocaleString()} ريال
                        </span>
                      ) : (
                        <span className="text-emerald-600 flex items-center gap-1 font-semibold">
                          <CheckCircle className="w-3.5 h-3.5" />
                          خالص
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5 flex-wrap">
                        <button
                          onClick={() => setSelectedDocsCustomer(customer)}
                          className="px-2 py-1 rounded-md bg-[#1A3668]/10 hover:bg-[#1A3668] hover:text-white text-[#1A3668] text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                          title="عرض أرشيف مستندات العميل (الفواتير، سندات القبض، كشوفات الحساب)"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>المستندات</span>
                        </button>

                        <button
                          onClick={() => handleStatementClick(customer)}
                          className="px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                          title="كشف حساب العميل"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>كشف حساب</span>
                        </button>

                        <button
                          onClick={() => onOpenPaymentForCustomer(customer)}
                          className="px-2 py-1 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                          title="سند قبض"
                        >
                          <Receipt className="w-3.5 h-3.5" />
                          <span>قبض</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer Documents Modal (Requirement 17) */}
      <CustomerDocumentsModal
        customer={selectedDocsCustomer}
        isOpen={!!selectedDocsCustomer}
        onClose={() => setSelectedDocsCustomer(null)}
        onOpenOrderInvoice={order => {
          if (onOpenOrderInvoice) onOpenOrderInvoice(order);
        }}
        onOpenReceipt={payment => {
          if (onOpenReceipt) onOpenReceipt(payment);
        }}
        onViewStatement={cust => {
          setSelectedDocsCustomer(null);
          handleStatementClick(cust);
        }}
        onOpenNewPayment={(cust, order) => {
          onOpenPaymentForCustomer(cust, order);
        }}
      />

    </div>
  );
};
