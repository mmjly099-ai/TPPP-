import React, { useState } from 'react';
import { X, Wallet, Building2, CreditCard } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { Account } from '../../types';

interface AddAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddAccountModal: React.FC<AddAccountModalProps> = ({ isOpen, onClose }) => {
  const { addAccount } = useStore();

  const [name, setName] = useState('');
  const [type, setType] = useState<Account['type']>('محفظة');
  const [openingBalance, setOpeningBalance] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('يرجى كتابة اسم الحساب أو المحفظة');
      return;
    }
    setFormError('');

    addAccount({
      name: name.trim(),
      type,
      openingBalance: Number(openingBalance) || 0,
      openingBalanceDate: new Date().toISOString(),
      status: 'active',
      notes: notes.trim() || null
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-5 my-8">
        
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">إضافة حساب أو محفظة مالية</h3>
              <p className="text-xs text-slate-500">إضافة محفظة، بطاقة دفع، أو حساب بنكي جديد</p>
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
          
          <div>
            <label className="font-bold text-slate-700 block mb-1">اسم الحساب / المحفظة *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="مثال: محفظة ون كاش، حساب الكريمي، فيزا بنك..."
              className="w-full border border-slate-200 rounded-lg p-2.5 font-medium"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">نوع الحساب *</label>
              <select
                value={type}
                onChange={e => setType(e.target.value as Account['type'])}
                className="w-full border border-slate-200 rounded-lg p-2.5 bg-white font-medium"
              >
                <option value="محفظة">محفظة إلكترونية</option>
                <option value="بطاقة">بطاقة دفع (VISA)</option>
                <option value="بنكي">حساب بنكي</option>
                <option value="نقدي">صندوق نقدي (كاش)</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">الرصيد الافتتاحي (ريال)</label>
              <input
                type="number"
                min="0"
                value={openingBalance || ''}
                onChange={e => setOpeningBalance(Number(e.target.value))}
                placeholder="0"
                className="w-full border border-slate-200 rounded-lg p-2.5 font-mono font-bold"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">ملاحظات الحساب</label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="رقم الحساب، اسم المالك..."
              className="w-full border border-slate-200 rounded-lg p-2.5"
            />
          </div>

          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-bold">
              {formError}
            </div>
          )}

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
              className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold transition-colors cursor-pointer shadow-xs"
            >
              إضافة الحساب
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
