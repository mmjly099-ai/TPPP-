import React, { useState } from 'react';
import { X, Scale, Wallet, AlertCircle } from 'lucide-react';
import { useStore } from '../../context/StoreContext';

interface NewReceivableModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewReceivableModal: React.FC<NewReceivableModalProps> = ({ isOpen, onClose }) => {
  const { addOtherReceivable, accounts } = useStore();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [entityType, setEntityType] = useState('سلفة شخصية');
  const [reason, setReason] = useState('');
  const [openingBalance, setOpeningBalance] = useState<number>(0);
  const [openingDate, setOpeningDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [fromAccountId, setFromAccountId] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('يرجى إدخال اسم المدين أو الجهة');
      return;
    }
    if (openingBalance <= 0) {
      setFormError('يرجى إدخال مبلغ صحيح أكبر من الصفر');
      return;
    }
    setFormError('');

    const fromAcc = fromAccountId ? accounts.find(a => a.id === Number(fromAccountId)) : undefined;

    addOtherReceivable({
      name: name.trim(),
      phone: phone.trim() || undefined,
      entityType,
      reason: reason.trim() || 'سلفة / قرض مالي',
      openingBalance: Number(openingBalance),
      openingDate,
      dueDate: dueDate || undefined,
      fromAccountId: fromAccountId ? Number(fromAccountId) : undefined,
      sourceAccountName: fromAcc?.name,
      notes: notes.trim() || undefined
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 my-8">
        
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
              <Scale className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">تسجيل سلفة / ذمة مدينة</h3>
              <p className="text-xs text-slate-500">إقراض مالي أو مديونية على شخص أو مندوب أو جهة</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">اسم المقترض / الطرف *</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="مثال: أحمد تمام"
                className="w-full border border-slate-200 rounded-lg p-2.5 font-medium"
                required
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">رقم الهاتف</label>
              <input
                type="text"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="77XXXXXXX"
                className="w-full border border-slate-200 rounded-lg p-2.5 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">نوع الذمة / الصفة</label>
              <select
                value={entityType}
                onChange={e => setEntityType(e.target.value)}
                className="w-full border border-slate-200 rounded-lg p-2.5 bg-white font-medium"
              >
                <option value="سلفة شخصية">سلفة شخصية</option>
                <option value="سلفة موظف">سلفة موظف</option>
                <option value="عهدة مندوب توصيل">عهدة مندوب توصيل</option>
                <option value="مصمم أنظمة">مصمم أنظمة / تقني</option>
                <option value="سلف عائلي / بيت">بيت / سلف عائلي</option>
                <option value="مورد">مورد</option>
                <option value="أخرى">جهة أخرى</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">المبلغ المسلف (ريال) *</label>
              <input
                type="number"
                min="1"
                value={openingBalance || ''}
                onChange={e => setOpeningBalance(Number(e.target.value))}
                placeholder="0"
                className="w-full border border-slate-200 rounded-lg p-2.5 font-mono font-bold text-blue-700 text-sm"
                required
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">مصدر خروج المبلغ (المحفظة / الصندوق)</label>
            <select
              value={fromAccountId}
              onChange={e => setFromAccountId(e.target.value)}
              className="w-full border border-slate-200 rounded-lg p-2.5 bg-white font-medium"
            >
              <option value="">-- بدون خصم فوري (ذمة سابقة مسجلة) --</option>
              {accounts
                .filter(a => a.status === 'active' && a.type !== 'حقوق ملكية')
                .map(acc => (
                  <option key={acc.id} value={acc.id}>
                    خصم وصرف من: {acc.name} ({acc.type})
                  </option>
                ))}
            </select>
            <span className="text-[10px] text-slate-400 mt-1 block">
              عند اختيار محفظة، سيتم تسجيل حركة سحب ونقصان رصيد المحفظة مع إثبات قيد يومية محاسبي تلقائي.
            </span>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">السبب / بيان السلفة *</label>
            <input
              type="text"
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="مثال: سلفة مؤقتة، عطل المتر، عهدة مصاريف..."
              className="w-full border border-slate-200 rounded-lg p-2.5"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">تاريخ الإقراض</label>
              <input
                type="date"
                value={openingDate}
                onChange={e => setOpeningDate(e.target.value)}
                className="w-full border border-slate-200 rounded-lg p-2.5 font-mono"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">تاريخ الاستحقاق المتوقع</label>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="w-full border border-slate-200 rounded-lg p-2.5 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">ملاحظات إضافية</label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="طريقة المحاسبة المتفق عليها، أقساط السداد..."
              className="w-full border border-slate-200 rounded-lg p-2.5"
            />
          </div>

          {formError && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-bold flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
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
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-colors cursor-pointer shadow-xs"
            >
              حفظ وتوثيق السلفة
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
