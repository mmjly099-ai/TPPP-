import React, { useState, useMemo } from 'react';
import {
  Users,
  Plus,
  Search,
  DollarSign,
  Coffee,
  Car,
  Wifi,
  FileText,
  Edit2,
  Trash2,
  X,
  Phone,
  Briefcase,
  CheckCircle2,
  Calendar,
  Wallet,
  ArrowRight,
  TrendingUp,
  Receipt,
  UserPlus,
  Printer
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { Worker, Expense } from '../types';

export const WorkersView: React.FC = () => {
  const { workers, expenses, accounts, addWorker, updateWorker, deleteWorker, addWorkerExpense } = useStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWorkerId, setSelectedWorkerId] = useState<number | 'ALL'>('ALL');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');

  // Modals state
  const [isNewWorkerModalOpen, setIsNewWorkerModalOpen] = useState(false);
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  const [deletingWorker, setDeletingWorker] = useState<Worker | null>(null);
  
  // Quick Log Expense for worker
  const [quickExpenseWorker, setQuickExpenseWorker] = useState<Worker | null>(null);
  const [isQuickExpenseModalOpen, setIsQuickExpenseModalOpen] = useState(false);

  // Statement modal for selected worker
  const [statementWorker, setStatementWorker] = useState<Worker | null>(null);

  // Calculate expense breakdown for each worker
  const workersWithStats = useMemo(() => {
    return (workers || []).map(worker => {
      // Find all expenses that match this worker either by vendorName or description
      const workerExpenses = expenses.filter(e => {
        if (e.status === 'cancelled') return false;
        const vendor = String(e.vendorName || '').trim();
        const desc = String(e.description || '').trim();
        const wName = worker.name.trim();

        return vendor.includes(wName) || desc.includes(wName);
      });

      let qatTotal = 0;
      let dinnerTotal = 0;
      let transportTotal = 0;
      let internetTotal = 0;
      let otherTotal = 0;

      workerExpenses.forEach(e => {
        const amt = parseFloat(String(e.amount || 0)) || 0;
        const cat = e.category || '';
        const desc = e.description || '';

        if (cat === 'قات' || desc.includes('قات')) {
          qatTotal += amt;
        } else if (cat === 'عشاء' || desc.includes('عشاء') || desc.includes('روتي')) {
          dinnerTotal += amt;
        } else if (cat === 'مواصلات' || desc.includes('مواصلات') || desc.includes('توصيل')) {
          transportTotal += amt;
        } else if (cat === 'إنترنت' || desc.includes('نت') || desc.includes('فورجي')) {
          internetTotal += amt;
        } else {
          otherTotal += amt;
        }
      });

      const totalSpent = qatTotal + dinnerTotal + transportTotal + internetTotal + otherTotal;

      return {
        ...worker,
        expensesCount: workerExpenses.length,
        totalSpent,
        qatTotal,
        dinnerTotal,
        transportTotal,
        internetTotal,
        otherTotal,
        expensesList: workerExpenses
      };
    });
  }, [workers, expenses]);

  // Global KPIs
  const globalStats = useMemo(() => {
    const totalWorkers = workersWithStats.length;
    let totalAllSpent = 0;
    let totalQat = 0;
    let totalDinner = 0;
    let totalTransport = 0;

    workersWithStats.forEach(w => {
      totalAllSpent += w.totalSpent;
      totalQat += w.qatTotal;
      totalDinner += w.dinnerTotal;
      totalTransport += w.transportTotal;
    });

    return {
      totalWorkers,
      totalAllSpent,
      totalQat,
      totalDinner,
      totalTransport
    };
  }, [workersWithStats]);

  // Filtered list
  const filteredWorkers = useMemo(() => {
    return workersWithStats.filter(w => {
      const term = searchTerm.trim().toLowerCase();
      if (!term) return true;
      return (
        w.name.toLowerCase().includes(term) ||
        w.role.toLowerCase().includes(term) ||
        (w.phone && w.phone.includes(term))
      );
    });
  }, [workersWithStats, searchTerm]);

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">قسم العمال وصرفياتهم التشغيلية</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                إدارة بيانات العمال، وصرفيات القات، العشاء، المواصلات، السلف والرواتب لكل عامل
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              setQuickExpenseWorker(workers[0] || null);
              setIsQuickExpenseModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>تسجيل صرفية لعامل</span>
          </button>

          <button
            onClick={() => setIsNewWorkerModalOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>إضافة عامل جديد</span>
          </button>
        </div>
      </div>

      {/* KPI Ribbon */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-bold">إجمالي صرفيات العمال</span>
            <span className="text-amber-600 bg-amber-50 p-1.5 rounded-lg">
              <Users className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl font-black font-mono text-slate-900 mt-2">
            {globalStats.totalAllSpent.toLocaleString()} <span className="text-xs text-slate-500 font-sans">ريال</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1 font-medium">
            موزعة على {globalStats.totalWorkers} عمال وموظفين
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-emerald-800 font-bold">🌿 إجمالي صرفيات القات</span>
            <span className="text-emerald-700 bg-emerald-100 p-1.5 rounded-lg text-xs font-bold">
              الصنف 1
            </span>
          </div>
          <div className="text-xl font-black font-mono text-emerald-700 mt-2">
            {globalStats.totalQat.toLocaleString()} <span className="text-xs text-slate-500 font-sans">ريال</span>
          </div>
          <div className="text-[11px] text-emerald-600 mt-1 font-medium">
            مخصومة من بند المصروفات اليومية
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-amber-200 bg-amber-50/20 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-amber-800 font-bold">🍽️ إجمالي صرفيات العشاء</span>
            <span className="text-amber-700 bg-amber-100 p-1.5 rounded-lg text-xs font-bold">
              الصنف 2
            </span>
          </div>
          <div className="text-xl font-black font-mono text-amber-700 mt-2">
            {globalStats.totalDinner.toLocaleString()} <span className="text-xs text-slate-500 font-sans">ريال</span>
          </div>
          <div className="text-[11px] text-amber-600 mt-1 font-medium">
            وجبات وعشاء ونثريات الغذاء
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-blue-200 bg-blue-50/20 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-blue-800 font-bold">🚗 مواصلات وسلف ونثريات</span>
            <Car className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl font-black font-mono text-blue-700 mt-2">
            {globalStats.totalTransport.toLocaleString()} <span className="text-xs text-slate-500 font-sans">ريال</span>
          </div>
          <div className="text-[11px] text-blue-600 mt-1 font-medium">
            مشاوير البنوك، التوصيل والمشاوير
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
          <input
            type="text"
            placeholder="بحث بالاسم، الصفة، أو الهاتف..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pr-9 pl-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500 w-full sm:w-auto justify-end">
          <span>عدد العمال:</span>
          <span className="font-bold text-slate-800 font-mono px-2 py-0.5 bg-slate-100 rounded-lg">
            {filteredWorkers.length}
          </span>
        </div>
      </div>

      {/* Workers Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredWorkers.map(worker => {
          return (
            <div
              key={worker.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:border-amber-300 transition-all p-5 flex flex-col justify-between space-y-4"
            >
              {/* Card Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-700 flex items-center justify-center font-bold text-base border border-amber-500/20">
                    {worker.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                      {worker.name}
                      <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {worker.status === 'active' ? 'نشط' : 'متوقف'}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      <Briefcase className="w-3 h-3 text-slate-400" />
                      <span>{worker.role || 'عامل تشغيل'}</span>
                    </p>
                    {worker.phone && (
                      <p className="text-[11px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3" />
                        <span>{worker.phone}</span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setEditingWorker(worker)}
                    className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                    title="تعديل بيانات العامل"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeletingWorker(worker)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    title="حذف العامل"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Total Spent Ribbon */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">إجمالي صرفيات العامل:</span>
                  <span className="font-mono font-bold text-rose-600 text-sm">
                    {worker.totalSpent.toLocaleString()} ريال
                  </span>
                </div>

                {worker.dailyWage ? (
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-200/60">
                    <span>اليومية / الراتب:</span>
                    <span className="font-mono text-slate-700 font-bold">{worker.dailyWage.toLocaleString()} ريال</span>
                  </div>
                ) : null}
              </div>

              {/* Breakdown Tags */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 rounded-xl bg-emerald-50/50 border border-emerald-100 flex items-center justify-between">
                  <span className="text-emerald-800 font-medium text-[11px]">🌿 قات:</span>
                  <span className="font-mono font-bold text-emerald-700">{worker.qatTotal.toLocaleString()}</span>
                </div>

                <div className="p-2 rounded-xl bg-amber-50/50 border border-amber-100 flex items-center justify-between">
                  <span className="text-amber-800 font-medium text-[11px]">🍽️ عشاء:</span>
                  <span className="font-mono font-bold text-amber-700">{worker.dinnerTotal.toLocaleString()}</span>
                </div>

                <div className="p-2 rounded-xl bg-blue-50/50 border border-blue-100 flex items-center justify-between">
                  <span className="text-blue-800 font-medium text-[11px]">🚗 مواصلات:</span>
                  <span className="font-mono font-bold text-blue-700">{worker.transportTotal.toLocaleString()}</span>
                </div>

                <div className="p-2 rounded-xl bg-purple-50/50 border border-purple-100 flex items-center justify-between">
                  <span className="text-purple-800 font-medium text-[11px]">🌐 إنترنت:</span>
                  <span className="font-mono font-bold text-purple-700">{worker.internetTotal.toLocaleString()}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => {
                    setQuickExpenseWorker(worker);
                    setIsQuickExpenseModalOpen(true);
                  }}
                  className="flex-1 py-2 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold transition-colors flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>تسجيل صرفية</span>
                </button>

                <button
                  onClick={() => setStatementWorker(worker)}
                  className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                  title="عرض كشف صرفيات هذا العامل"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>كشف حساب ({worker.expensesCount})</span>
                </button>
              </div>

            </div>
          );
        })}
      </div>

      {filteredWorkers.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 text-xs">
          لم يتم العثور على عمال مطابقين لمعايير البحث.
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 1: ADD / EDIT WORKER                                     */}
      {/* ============================================================== */}
      {(isNewWorkerModalOpen || editingWorker) && (
        <WorkerFormModal
          worker={editingWorker}
          onClose={() => {
            setIsNewWorkerModalOpen(false);
            setEditingWorker(null);
          }}
          onSave={(data) => {
            if (editingWorker) {
              updateWorker({ ...editingWorker, ...data });
            } else {
              addWorker(data as any);
            }
            setIsNewWorkerModalOpen(false);
            setEditingWorker(null);
          }}
        />
      )}

      {/* ============================================================== */}
      {/* MODAL 2: QUICK EXPENSE FOR WORKER                             */}
      {/* ============================================================== */}
      {isQuickExpenseModalOpen && (
        <QuickWorkerExpenseModal
          worker={quickExpenseWorker}
          workers={workers}
          accounts={accounts}
          onClose={() => {
            setIsQuickExpenseModalOpen(false);
            setQuickExpenseWorker(null);
          }}
          onSave={(data) => {
            addWorkerExpense(data);
            setIsQuickExpenseModalOpen(false);
            setQuickExpenseWorker(null);
          }}
        />
      )}

      {/* ============================================================== */}
      {/* MODAL 3: WORKER EXPENSES STATEMENT & LEDGER                    */}
      {/* ============================================================== */}
      {statementWorker && (
        <WorkerStatementModal
          worker={statementWorker}
          accounts={accounts}
          onClose={() => setStatementWorker(null)}
          onOpenLogExpense={() => {
            setQuickExpenseWorker(statementWorker);
            setIsQuickExpenseModalOpen(true);
          }}
        />
      )}

      {/* ============================================================== */}
      {/* MODAL 4: DELETE WORKER CONFIRMATION                            */}
      {/* ============================================================== */}
      {deletingWorker && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <h3 className="font-bold text-slate-900 text-base">تأكيد حذف العامل</h3>
            <p className="text-xs text-slate-600">
              هل أنت متأكد من حذف العامل <strong className="text-rose-600">{deletingWorker.name}</strong>؟
              (لن تُحذف الصرفيات السابقة المسجلة لضمان توازن القيود المحاسبية).
            </p>
            <div className="flex justify-end gap-2 pt-3">
              <button
                onClick={() => setDeletingWorker(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                إلغاء
              </button>
              <button
                onClick={() => {
                  deleteWorker(deletingWorker.id);
                  setDeletingWorker(null);
                }}
                className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl cursor-pointer"
              >
                حذف العامل
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

// =====================================================================
// SUB-COMPONENT: WORKER FORM MODAL
// =====================================================================
interface WorkerFormModalProps {
  worker: Worker | null;
  onClose: () => void;
  onSave: (data: Partial<Worker>) => void;
}

const WorkerFormModal: React.FC<WorkerFormModalProps> = ({ worker, onClose, onSave }) => {
  const [name, setName] = useState(worker?.name || '');
  const [role, setRole] = useState(worker?.role || 'موظف تشغيل');
  const [phone, setPhone] = useState(worker?.phone || '');
  const [dailyWage, setDailyWage] = useState<number>(worker?.dailyWage || 0);
  const [notes, setNotes] = useState(worker?.notes || '');
  const [status, setStatus] = useState<'active' | 'inactive'>(worker?.status || 'active');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSave({
      name: name.trim(),
      role: role.trim(),
      phone: phone.trim() || undefined,
      dailyWage: dailyWage > 0 ? Number(dailyWage) : undefined,
      notes: notes.trim() || undefined,
      status
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-amber-600" />
            <h3 className="font-bold text-slate-900 text-base">
              {worker ? `تعديل بيانات العامل: ${worker.name}` : 'إضافة عامل جديد'}
            </h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1">اسم العامل بالكامل *</label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="مثال: محمد طه، عبد الرحمن، مالك..."
              className="w-full border border-slate-200 rounded-xl p-2.5 font-bold"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">الصفة / الوظيفة *</label>
              <input
                type="text"
                required
                value={role}
                onChange={e => setRole(e.target.value)}
                placeholder="مثال: مسؤول مشتريات، توصيل..."
                className="w-full border border-slate-200 rounded-xl p-2.5"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">رقم الهاتف</label>
              <input
                type="text"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="777000000"
                className="w-full border border-slate-200 rounded-xl p-2.5 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">اليومية / الراتب (ريال)</label>
              <input
                type="number"
                min="0"
                value={dailyWage}
                onChange={e => setDailyWage(parseFloat(e.target.value) || 0)}
                placeholder="0"
                className="w-full border border-slate-200 rounded-xl p-2.5 font-mono font-bold"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">حالة العمل</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as any)}
                className="w-full border border-slate-200 rounded-xl p-2.5 font-bold"
              >
                <option value="active">نشط بالعمل</option>
                <option value="inactive">متوقف / في إجازة</option>
              </select>
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">ملاحظات إضافية</label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="أي تفاصيل حول مهام العامل أو ترتيبات الصرف..."
              className="w-full border border-slate-200 rounded-xl p-2.5"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-5 py-2 font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-xl shadow-xs cursor-pointer"
            >
              {worker ? 'حفظ التعديلات' : 'إضافة العامل'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// =====================================================================
// SUB-COMPONENT: QUICK WORKER EXPENSE MODAL
// =====================================================================
interface QuickWorkerExpenseModalProps {
  worker: Worker | null;
  workers: Worker[];
  accounts: any[];
  onClose: () => void;
  onSave: (data: {
    workerId: number;
    workerName: string;
    category: string;
    amount: number;
    accountId: number;
    description?: string;
    notes?: string;
  }) => void;
}

const QuickWorkerExpenseModal: React.FC<QuickWorkerExpenseModalProps> = ({
  worker,
  workers,
  accounts,
  onClose,
  onSave
}) => {
  const [selectedWorkerId, setSelectedWorkerId] = useState<number>(worker?.id || workers[0]?.id || 1);
  const [category, setCategory] = useState<string>('قات');
  const [amount, setAmount] = useState<number>(1000);
  const [accountId, setAccountId] = useState<number>(() => {
    const defaultAcc = accounts.find(a => a.name.includes('جيب')) || accounts[0];
    return defaultAcc ? defaultAcc.id : 1;
  });
  const [description, setDescription] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const currentWorker = workers.find(w => w.id === selectedWorkerId) || worker || workers[0];

  const quickCategories = [
    { label: 'قات', emoji: '🌿', defaultDesc: `قات لـ ${currentWorker?.name || ''}` },
    { label: 'عشاء', emoji: '🍽️', defaultDesc: `عشاء لـ ${currentWorker?.name || ''}` },
    { label: 'مواصلات', emoji: '🚗', defaultDesc: `مواصلات وتوصيل لـ ${currentWorker?.name || ''}` },
    { label: 'إنترنت', emoji: '🌐', defaultDesc: `باقة نت لـ ${currentWorker?.name || ''}` },
    { label: 'تشغيل', emoji: '⚡', defaultDesc: `مصروف تشغيل لـ ${currentWorker?.name || ''}` },
    { label: 'سلفة', emoji: '💵', defaultDesc: `سلفة نقدية لـ ${currentWorker?.name || ''}` }
  ];

  const handleSelectQuickCategory = (qc: typeof quickCategories[0]) => {
    setCategory(qc.label);
    setDescription(qc.defaultDesc);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0 || !currentWorker) return;

    onSave({
      workerId: currentWorker.id,
      workerName: currentWorker.name,
      category,
      amount,
      accountId,
      description: description.trim() || `صرفية ${category} لـ ${currentWorker.name}`,
      notes: notes.trim() || undefined
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-emerald-600" />
            <div>
              <h3 className="font-bold text-slate-900 text-base">تسجيل صرفية لعامل</h3>
              <p className="text-xs text-slate-500">خصم فوري من المحفظة وتحديث حساب العامل</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          
          {/* Worker Selector */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">اختر العامل *</label>
            <select
              value={selectedWorkerId}
              onChange={e => {
                const wid = Number(e.target.value);
                setSelectedWorkerId(wid);
                const w = workers.find(item => item.id === wid);
                if (w) {
                  setDescription(`صرفية ${category} لـ ${w.name}`);
                }
              }}
              className="w-full border border-slate-200 rounded-xl p-2.5 font-bold text-sm bg-white"
            >
              {workers.map(w => (
                <option key={w.id} value={w.id}>
                  👷 {w.name} — ({w.role})
                </option>
              ))}
            </select>
          </div>

          {/* Quick Category Pills */}
          <div>
            <label className="font-bold text-slate-700 block mb-1.5">نوع الصرفية (الأصناف الرئيسية):</label>
            <div className="grid grid-cols-3 gap-1.5">
              {quickCategories.map(qc => {
                const isSelected = category === qc.label;
                return (
                  <button
                    key={qc.label}
                    type="button"
                    onClick={() => handleSelectQuickCategory(qc)}
                    className={`py-2 px-2 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1 ${
                      isSelected
                        ? qc.label === 'قات'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : qc.label === 'عشاء'
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'bg-rose-600 text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    <span>{qc.emoji}</span>
                    <span>{qc.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Amount & Account */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">المبلغ (ريال يمني) *</label>
              <input
                type="number"
                min="1"
                required
                value={amount}
                onChange={e => setAmount(parseFloat(e.target.value) || 0)}
                className="w-full border border-slate-200 rounded-xl p-2.5 font-mono font-bold text-rose-600 text-base"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">الحساب الدافع *</label>
              <select
                value={accountId}
                onChange={e => setAccountId(Number(e.target.value))}
                className="w-full border border-slate-200 rounded-xl p-2.5 font-bold bg-white"
              >
                {accounts.filter(a => a.status === 'active' && a.type !== 'حقوق ملكية').map(a => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">بيان الصرفية *</label>
            <input
              type="text"
              required
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder={`مثال: قات لـ ${currentWorker?.name || ''}`}
              className="w-full border border-slate-200 rounded-xl p-2.5"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-5 py-2 font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs cursor-pointer"
            >
              حفظ وتسجيل الصرفية فوراً
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// =====================================================================
// SUB-COMPONENT: WORKER STATEMENT & EXPENSES LEDGER MODAL
// =====================================================================
interface WorkerStatementModalProps {
  worker: any;
  accounts: any[];
  onClose: () => void;
  onOpenLogExpense: () => void;
}

const WorkerStatementModal: React.FC<WorkerStatementModalProps> = ({
  worker,
  accounts,
  onClose,
  onOpenLogExpense
}) => {
  const [catFilter, setCatFilter] = useState('ALL');

  const list: Expense[] = worker.expensesList || [];

  const filteredList = useMemo(() => {
    if (catFilter === 'ALL') return list;
    return list.filter(e => {
      const c = e.category || '';
      const d = e.description || '';
      if (catFilter === 'قات') return c === 'قات' || d.includes('قات');
      if (catFilter === 'عشاء') return c === 'عشاء' || d.includes('عشاء');
      if (catFilter === 'مواصلات') return c === 'مواصلات' || d.includes('مواصلات');
      if (catFilter === 'إنترنت') return c === 'إنترنت' || d.includes('نت');
      return c === catFilter;
    });
  }, [list, catFilter]);

  const totalFiltered = filteredList.reduce((sum, e) => sum + (parseFloat(String(e.amount || 0)) || 0), 0);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-3xl w-full p-6 space-y-4 shadow-2xl border border-slate-200 my-6">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-700 flex items-center justify-center font-bold text-lg">
              {worker.name.charAt(0)}
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                كشف صرفيات العامل: {worker.name}
              </h3>
              <p className="text-xs text-slate-500">
                {worker.role} • إجمالي الصرفيات: <strong className="text-rose-600 font-mono">{worker.totalSpent.toLocaleString()} ريال</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
              title="طباعة كشف الصرفيات"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">طباعة</span>
            </button>
            <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          {['ALL', 'قات', 'عشاء', 'مواصلات', 'إنترنت'].map(cat => (
            <button
              key={cat}
              onClick={() => setCatFilter(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                catFilter === cat
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {cat === 'ALL' ? `جميع الصرفيات (${list.length})` : cat}
            </button>
          ))}
        </div>

        {/* Expenses Table */}
        <div className="border border-slate-200 rounded-xl overflow-hidden max-h-80 overflow-y-auto">
          {filteredList.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              لا توجد صرفيات مسجلة لهذا التصنيف.
            </div>
          ) : (
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold sticky top-0">
                <tr>
                  <th className="py-2.5 px-3">التاريخ</th>
                  <th className="py-2.5 px-3">رقم المصروف</th>
                  <th className="py-2.5 px-3">التصنيف</th>
                  <th className="py-2.5 px-3">البيان والتفاصيل</th>
                  <th className="py-2.5 px-3">الحساب الدافع</th>
                  <th className="py-2.5 px-3 text-left">المبلغ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredList.map(e => {
                  const acc = accounts.find(a => a.id === e.accountId);
                  const amt = parseFloat(String(e.amount || 0)) || 0;
                  const dateStr = e.createdAt ? new Date(e.createdAt).toLocaleDateString('ar-YE') : '-';

                  return (
                    <tr key={e.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-mono text-slate-500">{dateStr}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-700">{e.expenseNumber}</td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded-md font-bold text-[11px] bg-slate-100 text-slate-800">
                          {e.category}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-800">{e.description || '-'}</td>
                      <td className="py-2.5 px-3 text-slate-600">{acc?.name || e.paymentMethod || 'محفظة'}</td>
                      <td className="py-2.5 px-3 text-left font-mono font-bold text-rose-600">
                        {amt.toLocaleString()} ريال
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Total Summary Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
          <div className="text-slate-600">
            إجمالي المعروض: <strong className="font-mono text-rose-600 font-bold text-sm">{totalFiltered.toLocaleString()} ريال</strong>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                onOpenLogExpense();
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl cursor-pointer"
            >
              + تسجيل صرفية جديدة
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 font-bold rounded-xl cursor-pointer"
            >
              إغلاق
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
