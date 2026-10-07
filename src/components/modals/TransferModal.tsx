import React, { useState, useEffect } from 'react';
import { X, ArrowLeftRight, Wallet } from 'lucide-react';
import { useStore } from '../../context/StoreContext';

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  preSelectedFromAccountId?: number;
}

export const TransferModal: React.FC<TransferModalProps> = ({
  isOpen,
  onClose,
  preSelectedFromAccountId
}) => {
  const { accounts, getAccountBalance, transferFunds } = useStore();

  const activeAccounts = accounts.filter(a => a.status === 'active' && a.type !== 'حقوق ملكية');

  const [fromAccountId, setFromAccountId] = useState<number>(() => {
    return preSelectedFromAccountId || activeAccounts[0]?.id || 1;
  });

  const [toAccountId, setToAccountId] = useState<number>(() => {
    const second = activeAccounts.find(a => a.id !== (preSelectedFromAccountId || activeAccounts[0]?.id));
    return second ? second.id : activeAccounts[1]?.id || 2;
  });

  const [amount, setAmount] = useState<number>(0);
  const [notes, setNotes] = useState<string>('تغذية رصيد للبطاقة / المحفظة');
  const [formError, setFormError] = useState<string>('');

  useEffect(() => {
    if (preSelectedFromAccountId) {
      setFromAccountId(preSelectedFromAccountId);
      const different = activeAccounts.find(a => a.id !== preSelectedFromAccountId);
      if (different) setToAccountId(different.id);
    }
  }, [preSelectedFromAccountId, isOpen]);

  if (!isOpen) return null;

  const fromAcc = accounts.find(a => a.id === fromAccountId);
  const toAcc = accounts.find(a => a.id === toAccountId);
  const fromBalance = fromAcc ? getAccountBalance(fromAcc.id) : 0;
  const toBalance = toAcc ? getAccountBalance(toAcc.id) : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (fromAccountId === toAccountId) {
      setFormError('لا يمكن التحويل لنفس الحساب أو المحفظة');
      return;
    }
    if (amount <= 0) {
      setFormError('يرجى إدخال مبلغ صحيح أكبر من الصفر');
      return;
    }
    setFormError('');

    transferFunds(fromAccountId, toAccountId, Number(amount), notes.trim() || undefined);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-5 my-8">
        
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-800 flex items-center justify-center">
              <ArrowLeftRight className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">تحويل أموال بين الصناديق والمحافظ</h3>
              <p className="text-xs text-slate-500">تحويل بين جيب، كريمي، أم فلوس، وفيزا كارد مع إثبات القيود</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          
          {/* From & To Accounts */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-rose-50/40 p-3 rounded-xl border border-rose-100">
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold text-rose-900">من الحساب (تحويل صادر) *</label>
              </div>
              <select
                value={fromAccountId}
                onChange={e => setFromAccountId(Number(e.target.value))}
                className="w-full border border-slate-200 rounded-lg p-2 bg-white font-medium"
                required
              >
                {activeAccounts.map(a => (
                  <option key={a.id} value={a.id}>{a.name} ({a.type})</option>
                ))}
              </select>
              <span className="text-[10px] text-slate-500 block mt-1">
                الرصيد المتاح: <strong className="font-mono text-slate-800">{fromBalance.toLocaleString()} ريال</strong>
              </span>
            </div>

            <div className="bg-emerald-50/40 p-3 rounded-xl border border-emerald-100">
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold text-emerald-900">إلى الحساب (تحويل وارد) *</label>
              </div>
              <select
                value={toAccountId}
                onChange={e => setToAccountId(Number(e.target.value))}
                className="w-full border border-slate-200 rounded-lg p-2 bg-white font-medium"
                required
              >
                {activeAccounts.map(a => (
                  <option key={a.id} value={a.id} disabled={a.id === fromAccountId}>
                    {a.name} ({a.type})
                  </option>
                ))}
              </select>
              <span className="text-[10px] text-slate-500 block mt-1">
                الرصيد الحالي: <strong className="font-mono text-slate-800">{toBalance.toLocaleString()} ريال</strong>
              </span>
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">المبلغ المراد تحويله (ريال) *</label>
            <input
              type="number"
              min="1"
              value={amount || ''}
              onChange={e => setAmount(Number(e.target.value))}
              placeholder="0"
              className="w-full border border-slate-200 rounded-lg p-2.5 font-mono font-bold text-slate-900 text-sm"
              required
            />
          </div>

          {/* Notes */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">البيان / سبب التحويل</label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="مثال: شحن فيزا كارد بنك التضامن لمشتريات شي إن..."
              className="w-full border border-slate-200 rounded-lg p-2.5"
            />
          </div>

          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-bold">
              {formError}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold transition-colors cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold transition-colors cursor-pointer shadow-xs"
            >
              تنفيذ التحويل المالي
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
