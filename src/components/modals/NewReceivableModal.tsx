import React, { useState } from 'react';
import { X, HandCoins, Calendar, Wallet, FileText, User, Phone } from 'lucide-react';
import { useStore } from '../../context/StoreContext';

interface NewReceivableModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewReceivableModal: React.FC<NewReceivableModalProps> = ({ isOpen, onClose }) => {
  const { accounts, addOtherReceivable } = useStore();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [entityType, setEntityType] = useState('سلفة شخصية');
  const [reason, setReason] = useState('');
  const [amount, setAmount] = useState<string>('');
  const [accountId, setAccountId] = useState<string>(accounts[0]?.id ? String(accounts[0].id) : '');
  const [openingDate, setOpeningDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (!name.trim() || isNaN(parsedAmount) || parsedAmount <= 0) return;

    const selectedAcc = accounts.find(a => String(a.id) === accountId);

    addOtherReceivable({
      name: name.trim(),
      phone: phone.trim() || undefined,
      entityType,
      reason: reason.trim() || 'سلفة / مستحق',
      openingBalance: parsedAmount,
      remainingBalance: parsedAmount,
      paidAmount: 0,
      openingDate,
      dueDate: dueDate || undefined,
      fromAccountId: selectedAcc ? selectedAcc.id : undefined,
      sourceAccountName: selectedAcc ? selectedAcc.name : undefined,
      notes: notes.trim() || undefined
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <HandCoins className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-sm">إضافة سلفة أو ذمة جديدة</h3>
              <p className="text-xs text-slate-500">تسجيل مستحقات مالية للغير أو سلف شخصية وعائلية</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">اسم الشخص أو الجهة *</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="مثال: محمد سعيد"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full pr-9 pl-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-amber-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">رقم الهاتف</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="770000000"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full pr-9 pl-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-amber-400"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">تصنيف الذمة / السلفة</label>
              <select
                value={entityType}
                onChange={e => setEntityType(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-amber-400 text-slate-700"
              >
                <option value="سلفة شخصية">سلفة شخصية</option>
                <option value="سلفة موظف">سلفة موظف</option>
                <option value="عهدة مندوب توصيل">عهدة مندوب توصيل</option>
                <option value="مورد">مورد / مورد بضاعة</option>
                <option value="شريك">شريك عمل</option>
                <option value="مصمم">مصمم / مبرمج</option>
                <option value="بيت / عائلي">مصروف عائلي / بيت</option>
                <option value="جهة أخرى">جهة أخرى</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">المبلغ المطلوب (ر.ي) *</label>
              <input
                type="number"
                required
                min="1"
                placeholder="0"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-amber-400 font-mono font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ السلفة</label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="date"
                  value={openingDate}
                  onChange={e => setOpeningDate(e.target.value)}
                  className="w-full pr-9 pl-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-amber-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ الاستحقاق (اختياري)</label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="date"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  className="w-full pr-9 pl-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-amber-400"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">خصم المبلغ من الحساب (المحفظة/البنك)</label>
            <div className="relative">
              <Wallet className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <select
                value={accountId}
                onChange={e => setAccountId(e.target.value)}
                className="w-full pr-9 pl-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-amber-400 text-slate-700"
              >
                <option value="">بدون خصم من حساب محدد</option>
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.type})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">سبب أو بيان السلفة</label>
            <input
              type="text"
              placeholder="مثال: سلفة لحساب شراء معدات"
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-amber-400"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">ملاحظات إضافية</label>
            <textarea
              rows={2}
              placeholder="أي تفاصيل أو شروط خاصة بالسداد..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-amber-400"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              حفظ السلفة
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
