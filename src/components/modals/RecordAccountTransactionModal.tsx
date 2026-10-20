import React, { useState, useEffect } from 'react';
import {
  X,
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  Calendar,
  FileText,
  DollarSign,
  AlertCircle,
  Tag,
  Hash,
  CheckCircle2
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';

interface RecordAccountTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialType?: 'deposit' | 'withdrawal';
  initialAccountId?: number;
}

const INFLOW_CATEGORIES = [
  'رأس مال إضافي',
  'إيداع شخصي من المالك',
  'توريد مبيعات نقدية',
  'تسوية رصيد موجبة',
  'أرباح نقدية',
  'استرجاع نقدي / مردودات',
  'وارد متنوع / أخرى'
];

const OUTFLOW_CATEGORIES = [
  'مسحوبات شخصية للمالك',
  'عهدة نقدية مؤقتة',
  'سحب كاش / نقدية',
  'عمولة تحويل / صرافة بنكية',
  'تسوية رصيد سالبة',
  'صادر متنوع / أخرى'
];

export const RecordAccountTransactionModal: React.FC<RecordAccountTransactionModalProps> = ({
  isOpen,
  onClose,
  initialType = 'deposit',
  initialAccountId
}) => {
  const { accounts, getAccountBalance, recordAccountTransaction } = useStore();

  const activeAccounts = accounts.filter(a => a.status === 'active' && a.type !== 'حقوق ملكية');

  const [type, setType] = useState<'deposit' | 'withdrawal'>(initialType);
  const [accountId, setAccountId] = useState<number>(() => {
    return initialAccountId || activeAccounts[0]?.id || 1;
  });
  const [amount, setAmount] = useState<string>('');
  const [category, setCategory] = useState<string>(
    initialType === 'deposit' ? INFLOW_CATEGORIES[1] : OUTFLOW_CATEGORIES[0]
  );
  const [customCategory, setCustomCategory] = useState<string>('');
  const [transactionDate, setTransactionDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setType(initialType);
      if (initialAccountId) {
        setAccountId(initialAccountId);
      } else if (activeAccounts.length > 0 && !activeAccounts.some(a => a.id === accountId)) {
        setAccountId(activeAccounts[0].id);
      }
      setCategory(initialType === 'deposit' ? INFLOW_CATEGORIES[1] : OUTFLOW_CATEGORIES[0]);
      setCustomCategory('');
      setAmount('');
      setDescription('');
      setNotes('');
      setFormError(null);
      setReferenceNumber(`VCH-${initialType === 'deposit' ? 'IN' : 'OUT'}-${Date.now().toString().slice(-5)}`);
      setSuccessToast(false);
    }
  }, [isOpen, initialType, initialAccountId]);

  // When switching type, update default category and voucher prefix
  const handleTypeChange = (newType: 'deposit' | 'withdrawal') => {
    setType(newType);
    setCategory(newType === 'deposit' ? INFLOW_CATEGORIES[1] : OUTFLOW_CATEGORIES[0]);
    setCustomCategory('');
    setFormError(null);
    setReferenceNumber(`VCH-${newType === 'deposit' ? 'IN' : 'OUT'}-${Date.now().toString().slice(-5)}`);
  };

  if (!isOpen) return null;

  const selectedAcc = accounts.find(a => a.id === accountId);
  const currentBalance = selectedAcc ? getAccountBalance(selectedAcc.id) : 0;
  const numAmount = parseFloat(amount) || 0;
  const simulatedBalance = type === 'deposit'
    ? currentBalance + numAmount
    : currentBalance - numAmount;

  const isDeposit = type === 'deposit';
  const finalCategory = category === 'وارد متنوع / أخرى' || category === 'صادر متنوع / أخرى'
    ? (customCategory.trim() || category)
    : category;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!accountId) {
      setFormError('يرجى اختيار الصندوق أو المحفظة');
      return;
    }

    if (numAmount <= 0) {
      setFormError('يرجى إدخال مبلغ صحيح أكبر من الصفر');
      return;
    }

    const effectiveDesc = description.trim() || (isDeposit ? `إيداع نقدية (${finalCategory})` : `سحب نقدية (${finalCategory})`);

    recordAccountTransaction({
      accountId,
      type,
      amount: numAmount,
      category: finalCategory,
      description: effectiveDesc,
      referenceNumber: referenceNumber.trim() || undefined,
      transactionDate,
      notes: notes.trim() || undefined
    });

    setSuccessToast(true);
    setTimeout(() => {
      onClose();
    }, 600);
  };

  const handleQuickAddAmount = (addValue: number) => {
    const current = parseFloat(amount) || 0;
    setAmount(String(current + addValue));
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3 sm:p-4 overflow-y-auto backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-xl w-full p-5 sm:p-6 shadow-2xl space-y-5 my-6 border border-slate-100 transition-all">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-xs ${
              isDeposit
                ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                : 'bg-rose-100 text-rose-700 border border-rose-200'
            }`}>
              {isDeposit ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900">
                {isDeposit ? 'سند وارد نقدية (إيداع / قبض)' : 'سند صادر نقدية (سحب / صرف)'}
              </h2>
              <p className="text-xs text-slate-500">
                إدارة السيولة النقدية المباشرة في الصناديق والمحافظ والحسابات البنكية
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Type Toggle Tabs (وارد vs صادر) */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100/80 rounded-2xl border border-slate-200/80">
          <button
            type="button"
            onClick={() => handleTypeChange('deposit')}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
              isDeposit
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span>حركة وارد (إيداع نقدية +)</span>
          </button>
          
          <button
            type="button"
            onClick={() => handleTypeChange('withdrawal')}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
              !isDeposit
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>حركة صادر (سحب نقدية -)</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 text-xs font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{formError}</span>
            </div>
          )}

          {/* Target Account / Fund */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Wallet className="w-4 h-4 text-amber-500" />
                <span>{isDeposit ? 'الصندوق / المحفظة المستلمة (وارد إلى)' : 'الصندوق / المحفظة الدافعة (صادر من)'}</span>
              </span>
              {selectedAcc && (
                <span className="text-[11px] font-mono text-slate-500 font-semibold">
                  الرصيد المتاح: {currentBalance.toLocaleString()} ريال
                </span>
              )}
            </label>
            <select
              value={accountId}
              onChange={e => setAccountId(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 font-medium text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all cursor-pointer"
            >
              {activeAccounts.map(acc => {
                const bal = getAccountBalance(acc.id);
                return (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.type}) - الرصيد: {bal.toLocaleString()} ريال
                  </option>
                );
              })}
            </select>
          </div>

          {/* Amount & Quick Add Buttons */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <DollarSign className={`w-4 h-4 ${isDeposit ? 'text-emerald-500' : 'text-rose-500'}`} />
              <span>مبلغ السند (بالريال اليمني) *</span>
            </label>
            <div className="relative">
              <input
                type="number"
                step="any"
                min="0"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="أدخل المبلغ..."
                required
                className={`w-full px-3.5 py-2.5 rounded-xl border font-mono font-bold text-base focus:outline-none transition-all ${
                  isDeposit
                    ? 'border-emerald-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-emerald-950 bg-emerald-50/20'
                    : 'border-rose-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 text-rose-950 bg-rose-50/20'
                }`}
              />
              <span className="absolute left-3 top-3 text-xs font-bold text-slate-400">ريال</span>
            </div>

            {/* Quick Amount Buttons */}
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <span className="text-[10px] text-slate-400 font-semibold ml-1">إضافة سريعة:</span>
              {[5000, 10000, 25000, 50000, 100000].map(val => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleQuickAddAmount(val)}
                  className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-mono font-semibold transition-colors cursor-pointer"
                >
                  +{val.toLocaleString()}
                </button>
              ))}
              {numAmount > 0 && (
                <button
                  type="button"
                  onClick={() => setAmount('')}
                  className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-rose-100 text-rose-600 text-[11px] font-semibold transition-colors cursor-pointer mr-auto"
                >
                  تصفير
                </button>
              )}
            </div>
          </div>

          {/* Category / Source or Reason */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-amber-500" />
                <span>{isDeposit ? 'مصدر الوارد / بند الإيداع' : 'سبب الصادر / بند السحب'}</span>
              </label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all cursor-pointer"
              >
                {(isDeposit ? INFLOW_CATEGORIES : OUTFLOW_CATEGORIES).map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Date */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-500" />
                <span>تاريخ الحركة</span>
              </label>
              <input
                type="date"
                value={transactionDate}
                onChange={e => setTransactionDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
              />
            </div>
          </div>

          {/* Custom Category Input if 'other' is selected */}
          {(category === 'وارد متنوع / أخرى' || category === 'صادر متنوع / أخرى') && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">حدد البند يدوياً</label>
              <input
                type="text"
                value={customCategory}
                onChange={e => setCustomCategory(e.target.value)}
                placeholder="أدخل مسمى البند..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-amber-500"
              />
            </div>
          )}

          {/* Reference & Description */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-slate-400" />
                <span>رقم السند / الإشعار (اختياري)</span>
              </label>
              <input
                type="text"
                value={referenceNumber}
                onChange={e => setReferenceNumber(e.target.value)}
                placeholder="رقم السند أو الإشعار البنكي"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 text-xs font-mono focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                <span>البيان / الوصف</span>
              </label>
              <input
                type="text"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder={isDeposit ? 'مثال: تغذية الصندوق أو دفعة إيداع' : 'مثال: سحب نقدي أو مسحوبات شخصية'}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 text-xs focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Additional Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">ملاحظات إضافية (اختياري)</label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="أي تفاصيل أخرى تخص الحركة..."
              className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-800 text-xs focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Live Balance Impact Preview Card */}
          <div className={`p-3.5 rounded-2xl border ${
            isDeposit
              ? 'bg-emerald-50/60 border-emerald-200/80'
              : simulatedBalance < 0
                ? 'bg-rose-50 border-rose-300'
                : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center justify-between text-xs font-semibold mb-2">
              <span className="text-slate-700">معاينة تأثير الحركة على رصيد {selectedAcc?.name}:</span>
              {simulatedBalance < 0 && !isDeposit && (
                <span className="text-rose-600 font-bold flex items-center gap-1 text-[11px]">
                  <AlertCircle className="w-3.5 h-3.5" />
                  المبلغ يتجاوز الرصيد الحالي
                </span>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-white/80 p-2 rounded-xl border border-slate-200/60">
                <span className="text-[10px] text-slate-500 block">الرصيد الحالي</span>
                <span className="text-xs font-mono font-bold text-slate-800">
                  {currentBalance.toLocaleString()}
                </span>
              </div>
              <div className={`p-2 rounded-xl border ${
                isDeposit
                  ? 'bg-emerald-100/80 border-emerald-200 text-emerald-900'
                  : 'bg-rose-100/80 border-rose-200 text-rose-900'
              }`}>
                <span className="text-[10px] block font-semibold">
                  {isDeposit ? 'الوارد المضاف' : 'الصادر المخصوم'}
                </span>
                <span className="text-xs font-mono font-bold">
                  {isDeposit ? `+${numAmount.toLocaleString()}` : numAmount.toLocaleString()}
                </span>
              </div>
              <div className="bg-white/80 p-2 rounded-xl border border-slate-200/60">
                <span className="text-[10px] text-slate-500 block">الرصيد بعد الحركة</span>
                <span className={`text-xs font-mono font-bold ${
                  simulatedBalance < 0 ? 'text-rose-600' : 'text-slate-900'
                }`}>
                  {simulatedBalance.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-100 transition-colors cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={numAmount <= 0}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                isDeposit
                  ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                  : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
              }`}
            >
              {successToast ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  <span>تم التسجيل بنجاح!</span>
                </>
              ) : (
                <>
                  {isDeposit ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                  <span>{isDeposit ? 'تأكيد وحفظ سند الوارد' : 'تأكيد وحفظ سند الصادر'}</span>
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
