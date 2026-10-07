import React, { useState, useMemo } from 'react';
import {
  Receipt,
  Plus,
  Search,
  Filter,
  TrendingDown,
  Calendar,
  Building,
  User,
  Tag,
  Truck,
  ShieldCheck,
  Package,
  Edit2,
  Trash2,
  ShieldAlert,
  X
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { Expense } from '../types';

interface ExpensesViewProps {
  onOpenNewExpense: () => void;
}

export const ExpensesView: React.FC<ExpensesViewProps> = ({ onOpenNewExpense }) => {
  const { expenses, accounts, totalExpenses, shipments, updateExpense, deleteExpense } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  // Edit & Delete states
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);

  const categories = useMemo(() => {
    return Array.from(new Set(expenses.map(e => e.category).filter(Boolean)));
  }, [expenses]);

  // Breakdown metrics
  const metrics = useMemo(() => {
    let logisticsTotal = 0;
    let operationalTotal = 0;

    expenses.forEach(e => {
      if (e.status === 'cancelled') return;
      const amt = parseFloat(String(e.amount || 0)) || 0;
      if (e.category === 'شحن ونقل لوجستي' || e.category === 'شحن' || e.expenseNumber.startsWith('EXP-SHP-')) {
        logisticsTotal += amt;
      } else {
        operationalTotal += amt;
      }
    });

    return {
      total: logisticsTotal + operationalTotal,
      logisticsTotal,
      operationalTotal,
      shipmentsCount: shipments.length
    };
  }, [expenses, shipments]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      const term = searchTerm.toLowerCase();
      const matchesSearch =
        e.description.toLowerCase().includes(term) ||
        (e.vendorName && e.vendorName.toLowerCase().includes(term)) ||
        e.expenseNumber.toLowerCase().includes(term);

      const matchesCategory = selectedCategory === 'ALL' || e.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [expenses, searchTerm, selectedCategory]);

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">سجل المصاريف والتشغيل اللوجستي</h2>
            <span className="bg-rose-100 text-rose-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
              تخصم من الأرباح
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            متابعة مصاريف الشحن اللوجستي، التسويق، الإنترنت، التغليف، المصاريف اليومية والرسوم
          </p>
        </div>

        <button
          onClick={onOpenNewExpense}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>تسجيل مصروف جديد</span>
        </button>
      </div>

      {/* KPI & Summary Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500">إجمالي المصروفات الكلية</span>
          <div className="text-xl font-black font-mono text-rose-600 mt-1">
            {metrics.total.toLocaleString()} <span className="text-xs text-slate-500 font-sans">ريال</span>
          </div>
          <div className="text-[10px] text-emerald-600 font-medium mt-1.5 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" />
            <span>تخصم بالكامل من هامش الربح الصافي</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-purple-200 bg-purple-50/30 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-purple-700 font-bold">مصاريف الشحن واللوجستيات</span>
            <Truck className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-xl font-black font-mono text-purple-700 mt-1">
            {metrics.logisticsTotal.toLocaleString()} <span className="text-xs text-slate-500 font-sans">ريال</span>
          </div>
          <div className="text-[10px] text-purple-600 font-medium mt-1.5">
            تغطي {metrics.shipmentsCount} شحنة بضائع خارجية
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500">المصاريف التشغيلية والإدارية</span>
          <div className="text-xl font-black font-mono text-slate-900 mt-1">
            {metrics.operationalTotal.toLocaleString()} <span className="text-xs text-slate-500 font-sans">ريال</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1.5">
            تسويق، اتصالات، تغليف، نثرية
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500">إجمالي العمليات المسجلة</span>
          <div className="text-xl font-black font-mono text-slate-800 mt-1">
            {expenses.length} <span className="text-xs text-slate-500 font-sans">بند مصروف</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1.5">
            موزعة على {categories.length} تصنيفات
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
          <input
            type="text"
            placeholder="بحث في البيان، المستفيد، شركة النقل، أو رقم المصروف..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pr-9 pl-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:border-rose-500"
          />
        </div>

        <select
          value={selectedCategory}
          onChange={e => setSelectedCategory(e.target.value)}
          className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-hidden focus:border-rose-500"
        >
          <option value="ALL">جميع التصنيفات ({expenses.length})</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>
              {cat} ({expenses.filter(e => e.category === cat).length})
            </option>
          ))}
        </select>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        {filteredExpenses.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs">
            لا توجد مصاريف مطابقة لمعايير البحث.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                <tr>
                  <th className="py-3 px-4">رقم المصروف</th>
                  <th className="py-3 px-4">التاريخ</th>
                  <th className="py-3 px-4">التصنيف</th>
                  <th className="py-3 px-4">البيان والتفاصيل</th>
                  <th className="py-3 px-4">المستفيد / الناقل</th>
                  <th className="py-3 px-4">الحساب الدافع</th>
                  <th className="py-3 px-4 text-left">المبلغ</th>
                  <th className="py-3 px-4 text-center w-28">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredExpenses.map(expense => {
                  const acc = accounts.find(a => a.id === expense.accountId);
                  const amt = parseFloat(String(expense.amount || 0));
                  const isLogistics = expense.category === 'شحن ونقل لوجستي' || expense.category === 'شحن' || expense.expenseNumber.startsWith('EXP-SHP-');

                  return (
                    <tr key={expense.id} className={`hover:bg-slate-50/70 transition-colors ${isLogistics ? 'bg-purple-50/15' : ''}`}>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-700">
                        {expense.expenseNumber}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-600">
                        {new Date(expense.createdAt).toLocaleDateString('ar-YE')}
                      </td>
                      <td className="py-3.5 px-4">
                        {isLogistics ? (
                          <span className="bg-purple-50 text-purple-700 border border-purple-200 font-bold px-2 py-0.5 rounded-md text-[11px] inline-flex items-center gap-1">
                            <Truck className="w-3 h-3" />
                            {expense.category}
                          </span>
                        ) : (
                          <span className="bg-rose-50 text-rose-700 font-medium px-2 py-0.5 rounded-md text-[11px]">
                            {expense.category}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-800">
                        {expense.description}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-medium">
                        {expense.vendorName || '-'}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-700">
                        {acc?.name || expense.paymentMethod || 'محفظة'}
                      </td>
                      <td className="py-3.5 px-4 text-left font-mono font-bold text-rose-600 text-sm">
                        {amt.toLocaleString()} ريال
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setEditingExpense(expense)}
                            className="p-1 rounded-md bg-amber-50 hover:bg-amber-100 text-amber-700 transition-colors cursor-pointer"
                            title="تعديل بيانات المصروف وقيده المحاسبي"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeletingExpense(expense)}
                            className="p-1 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-700 transition-colors cursor-pointer"
                            title="حذف المصروف وقيده المحاسبي وحركته النقدية"
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

      {/* Edit Expense Modal */}
      {editingExpense && (
        <EditExpenseModal
          expense={editingExpense}
          accounts={accounts}
          categories={categories}
          onClose={() => setEditingExpense(null)}
          onSave={data => {
            updateExpense(editingExpense.id, data);
            setEditingExpense(null);
          }}
        />
      )}

      {/* Cascading Delete Expense Warning Modal */}
      {deletingExpense && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-slate-200">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">حذف المصروف وتصفية القيد المحاسبي</h3>
                <p className="text-xs text-slate-500">حذف متزامن ذكي (Cascading Deletion)</p>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl space-y-2 text-xs border border-slate-200">
              <div className="flex justify-between font-bold text-slate-800">
                <span>رقم المصروف:</span>
                <span className="font-mono text-rose-600">{deletingExpense.expenseNumber}</span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>التصنيف:</span>
                <span>{deletingExpense.category}</span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>البيان:</span>
                <span>{deletingExpense.description}</span>
              </div>
              <div className="flex justify-between font-bold text-slate-900">
                <span>المبلغ:</span>
                <span className="font-mono text-rose-600">{Number(deletingExpense.amount).toLocaleString()} ريال</span>
              </div>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1.5">
              <span className="font-bold block">⚠️ سيقوم النظام تلقائياً وبشكل فوري بما يلي:</span>
              <ul className="list-disc list-inside space-y-1 text-slate-700 pr-1">
                <li>حذف قيد اليومية المحاسبي التابع لهذا المصروف كلياً.</li>
                <li>حذف الحركة النقدية المسجلة في الحساب المالي وإعادة رصيد المبلغ لحساب الخزينة/المحفظة فوراً.</li>
                <li>تحديث إجمالي المصروفات وصافي الأرباح بميزان المراجعة وقائمة الدخل.</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setDeletingExpense(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                إلغاء
              </button>
              <button
                onClick={() => {
                  deleteExpense(deletingExpense.id);
                  setDeletingExpense(null);
                }}
                className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition shadow-xs cursor-pointer"
              >
                تأكيد الحذف المتزامن
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

// =====================================================================
// SUB-COMPONENT: EDIT EXPENSE MODAL
// =====================================================================
interface EditExpenseModalProps {
  expense: Expense;
  accounts: any[];
  categories: string[];
  onClose: () => void;
  onSave: (data: Partial<Expense>) => void;
}

const EditExpenseModal: React.FC<EditExpenseModalProps> = ({
  expense,
  accounts,
  categories,
  onClose,
  onSave
}) => {
  const [category, setCategory] = useState(expense.category || 'نثريات');
  const [amount, setAmount] = useState<number>(Number(expense.amount) || 0);
  const [accountId, setAccountId] = useState<number>(expense.accountId);
  const [vendorName, setVendorName] = useState(expense.vendorName || '');
  const [description, setDescription] = useState(expense.description || '');
  const [notes, setNotes] = useState(expense.notes || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0 || !description.trim()) return;

    onSave({
      category,
      amount,
      accountId,
      vendorName,
      description,
      notes
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Edit2 className="w-5 h-5 text-amber-600" />
            <h3 className="text-base font-bold text-slate-900">تعديل المصروف {expense.expenseNumber}</h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div className="space-y-1">
            <label className="font-bold text-slate-700">التصنيف:</label>
            <input
              type="text"
              required
              list="expense-categories"
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full border border-slate-200 rounded-lg p-2 font-bold"
            />
            <datalist id="expense-categories">
              {categories.map((c, i) => (
                <option key={i} value={c} />
              ))}
            </datalist>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-slate-700">المبلغ بالريال *</label>
              <input
                type="number"
                min="1"
                required
                value={amount}
                onChange={e => setAmount(parseFloat(e.target.value) || 0)}
                className="w-full border border-slate-200 rounded-lg p-2 font-mono font-bold text-rose-600"
              />
            </div>
            <div className="space-y-1">
              <label className="font-bold text-slate-700">الحساب المالي الدافع *</label>
              <select
                value={accountId}
                onChange={e => setAccountId(Number(e.target.value))}
                className="w-full border border-slate-200 rounded-lg p-2 font-bold"
              >
                {accounts.filter(a => a.status === 'active' && a.type !== 'حقوق ملكية').map(a => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-bold text-slate-700">المستفيد / الجهة:</label>
            <input
              type="text"
              value={vendorName}
              onChange={e => setVendorName(e.target.value)}
              placeholder="مثال: يمن نت، شركة الشحن..."
              className="w-full border border-slate-200 rounded-lg p-2"
            />
          </div>

          <div className="space-y-1">
            <label className="font-bold text-slate-700">البيان والتفاصيل *</label>
            <input
              type="text"
              required
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full border border-slate-200 rounded-lg p-2"
            />
          </div>

          <div className="space-y-1">
            <label className="font-bold text-slate-700">ملاحظات إضافية:</label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full border border-slate-200 rounded-lg p-2"
            />
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
              حفظ وتحديث القيد والحساب
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
